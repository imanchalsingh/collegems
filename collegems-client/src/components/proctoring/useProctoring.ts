import { useCallback, useEffect, useRef, useState } from "react";
import api from "../../api/axios";
import { useSocket } from "../../context/SocketContext";

export type ViolationType =
  | "tab_switch"
  | "window_blur"
  | "missing_face"
  | "multiple_faces"
  | "camera_blocked"
  | "fullscreen_exit";

export type ProctoringStatus = {
  sessionId: string | null;
  active: boolean;
  faceCount: number;
  totalViolations: number;
  warningCount: number;
  lastWarning: string | null;
  cameraReady: boolean;
  modelReady: boolean;
  forceSubmit: boolean;
  stream: MediaStream | null;
};

type Options = {
  quizId?: string;
  enabled?: boolean;
  warnAfter?: number;
  autoSubmitAfter?: number;
  onForceSubmit?: () => void;
  onWarning?: (message: string) => void;
};

const FACE_CHECK_MS = 1500;
const MISSING_FACE_GRACE = 2; // consecutive misses before logging

export function useProctoring(options: Options) {
  const {
    quizId,
    enabled = true,
    onForceSubmit,
    onWarning,
  } = options;

  const { socket } = useSocket();
  const [status, setStatus] = useState<ProctoringStatus>({
    sessionId: null,
    active: false,
    faceCount: 0,
    totalViolations: 0,
    warningCount: 0,
    lastWarning: null,
    cameraReady: false,
    modelReady: false,
    forceSubmit: false,
    stream: null,
  });

  const sessionIdRef = useRef<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const detectorRef = useRef<any>(null);
  const missStreakRef = useRef(0);
  const lastViolationAtRef = useRef<Record<string, number>>({});
  const endedRef = useRef(false);

  const cooldownOk = (type: string, ms = 4000) => {
    const now = Date.now();
    const last = lastViolationAtRef.current[type] || 0;
    if (now - last < ms) return false;
    lastViolationAtRef.current[type] = now;
    return true;
  };

  const reportViolation = useCallback(
    async (type: ViolationType, message: string, meta: Record<string, unknown> = {}) => {
      const sid = sessionIdRef.current;
      if (!sid || endedRef.current) return;
      if (!cooldownOk(type)) return;

      try {
        const res = await api.post(`/proctoring/sessions/${sid}/violations`, {
          type,
          message,
          meta,
        });
        setStatus((prev) => ({
          ...prev,
          totalViolations: res.data.totalViolations ?? prev.totalViolations + 1,
          warningCount: res.data.warningCount ?? prev.warningCount,
          forceSubmit: Boolean(res.data.forceSubmit),
        }));

        if (res.data.warningIssued) {
          const warnMsg =
            `Warning: ${message}. Further violations may auto-submit your exam.`;
          setStatus((prev) => ({ ...prev, lastWarning: warnMsg }));
          onWarning?.(warnMsg);
        }
        if (res.data.forceSubmit) {
          endedRef.current = true;
          setStatus((prev) => ({ ...prev, forceSubmit: true, active: false }));
          onForceSubmit?.();
        }
      } catch (err) {
        console.error("Failed to report proctoring violation", err);
      }
    },
    [onForceSubmit, onWarning],
  );

  const detectFaces = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    let faces = 0;
    try {
      if (detectorRef.current?.estimateFaces) {
        const preds = await detectorRef.current.estimateFaces(video, false);
        faces = preds?.length || 0;
      } else if (typeof window !== "undefined" && "FaceDetector" in window) {
        const native = detectorRef.current as { detect: (v: HTMLVideoElement) => Promise<unknown[]> };
        const preds = await native.detect(video);
        faces = preds?.length || 0;
      } else {
        // No model: treat camera as present if stream is live
        faces = streamRef.current?.active ? 1 : 0;
      }
    } catch {
      faces = streamRef.current?.active ? 1 : 0;
    }

    setStatus((prev) => ({ ...prev, faceCount: faces }));
    socket?.emit("proctoring:heartbeat", {
      sessionId: sessionIdRef.current,
      faceCount: faces,
    });

    if (faces === 0) {
      missStreakRef.current += 1;
      if (missStreakRef.current >= MISSING_FACE_GRACE) {
        void reportViolation("missing_face", "No face detected in webcam", { faceCount: 0 });
        missStreakRef.current = 0;
      }
    } else if (faces > 1) {
      missStreakRef.current = 0;
      void reportViolation("multiple_faces", `Multiple faces detected (${faces})`, {
        faceCount: faces,
      });
    } else {
      missStreakRef.current = 0;
    }
  }, [reportViolation, socket]);

  const attachVideo = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && streamRef.current) {
      el.srcObject = streamRef.current;
      void el.play().catch(() => undefined);
    }
  }, []);

  const stop = useCallback(async () => {
    endedRef.current = true;
    const sid = sessionIdRef.current;
    if (sid) {
      try {
        await api.post(`/proctoring/sessions/${sid}/end`, { reason: "completed" });
      } catch {
        /* ignore */
      }
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    sessionIdRef.current = null;
    setStatus((prev) => ({
      ...prev,
      active: false,
      stream: null,
      cameraReady: false,
    }));
  }, []);

  // Start session + camera + model
  useEffect(() => {
    if (!enabled || !quizId) return;
    let cancelled = false;
    let faceTimer: number | undefined;

    const boot = async () => {
      try {
        const sessionRes = await api.post("/proctoring/sessions/start", { quizId });
        if (cancelled) return;
        sessionIdRef.current = sessionRes.data.sessionId;
        endedRef.current = false;
        setStatus((prev) => ({
          ...prev,
          sessionId: sessionRes.data.sessionId,
          active: true,
        }));

        socket?.emit("proctoring:join", {
          sessionId: sessionRes.data.sessionId,
          quizId,
        });

        let stream: MediaStream | null = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user", width: 640, height: 480 },
            audio: false,
          });
        } catch {
          void reportViolation("camera_blocked", "Webcam permission denied or unavailable");
        }

        if (cancelled) {
          stream?.getTracks().forEach((t) => t.stop());
          return;
        }

        if (stream) {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            void videoRef.current.play().catch(() => undefined);
          }
          setStatus((prev) => ({ ...prev, stream, cameraReady: true }));
        }

        // Prefer BlazeFace; fall back to FaceDetector API
        try {
          const tf = await import("@tensorflow/tfjs");
          await tf.setBackend("webgl");
          await tf.ready();
          const blazeface = await import("@tensorflow-models/blazeface");
          detectorRef.current = await blazeface.load();
          if (!cancelled) setStatus((prev) => ({ ...prev, modelReady: true }));
        } catch {
          if ("FaceDetector" in window) {
            // @ts-expect-error FaceDetector is not in all TS libs
            detectorRef.current = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 5 });
            if (!cancelled) setStatus((prev) => ({ ...prev, modelReady: true }));
          } else {
            if (!cancelled) setStatus((prev) => ({ ...prev, modelReady: false }));
          }
        }

        faceTimer = window.setInterval(() => {
          void detectFaces();
        }, FACE_CHECK_MS);
      } catch (err) {
        console.error("Proctoring boot failed", err);
      }
    };

    void boot();

    return () => {
      cancelled = true;
      if (faceTimer) window.clearInterval(faceTimer);
      void stop();
    };
  }, [enabled, quizId, socket, detectFaces, reportViolation, stop]);

  // Tab / focus monitoring
  useEffect(() => {
    if (!enabled || !status.active) return;

    const onVisibility = () => {
      if (document.hidden) {
        void reportViolation("tab_switch", "Student switched away from the exam tab");
      }
    };
    const onBlur = () => {
      void reportViolation("window_blur", "Exam window lost focus");
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
    };
  }, [enabled, status.active, reportViolation]);

  // Socket force-submit / warnings
  useEffect(() => {
    if (!socket) return;
    const handleWarningEvent = (payload: { message?: string; warningCount?: number }) => {
      const msg = payload.message || "Proctoring warning issued";
      setStatus((prev) => ({
        ...prev,
        lastWarning: msg,
        warningCount: payload.warningCount ?? prev.warningCount,
      }));
      onWarning?.(msg);
    };
    const handleForceSubmit = () => {
      endedRef.current = true;
      setStatus((prev) => ({ ...prev, forceSubmit: true, active: false }));
      onForceSubmit?.();
    };

    socket.on("proctoring:warning", handleWarningEvent);
    socket.on("proctoring:force_submit", handleForceSubmit);
    return () => {
      socket.off("proctoring:warning", handleWarningEvent);
      socket.off("proctoring:force_submit", handleForceSubmit);
    };
  }, [socket, onForceSubmit, onWarning]);

  return {
    status,
    attachVideo,
    reportViolation,
    stop,
    videoRef,
  };
}
