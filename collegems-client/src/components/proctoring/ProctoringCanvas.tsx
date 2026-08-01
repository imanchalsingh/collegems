import { useEffect, useRef } from "react";
import { Camera, ShieldAlert, UserRound } from "lucide-react";
import type { ProctoringStatus } from "./useProctoring";

type Props = {
  status: ProctoringStatus;
  attachVideo: (el: HTMLVideoElement | null) => void;
  compact?: boolean;
};

export default function ProctoringCanvas({ status, attachVideo, compact = false }: Props) {
  const localRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    attachVideo(localRef.current);
    return () => attachVideo(null);
  }, [attachVideo]);

  useEffect(() => {
    if (localRef.current && status.stream) {
      localRef.current.srcObject = status.stream;
      void localRef.current.play().catch(() => undefined);
    }
  }, [status.stream]);

  return (
    <div
      className={`overflow-hidden rounded-xl border border-gray-200 bg-gray-900 text-white shadow-lg dark:border-gray-700 ${
        compact ? "w-44" : "w-full max-w-xs"
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2 text-xs">
        <span className="inline-flex items-center gap-1 font-medium">
          <Camera className="h-3.5 w-3.5" /> Proctoring
        </span>
        <span
          className={`rounded-full px-2 py-0.5 ${
            status.active ? "bg-emerald-500/20 text-emerald-300" : "bg-gray-500/30 text-gray-300"
          }`}
        >
          {status.active ? "Live" : "Idle"}
        </span>
      </div>

      <div className={`relative bg-black ${compact ? "h-28" : "h-40"}`}>
        <video
          ref={localRef}
          muted
          playsInline
          autoPlay
          className="h-full w-full object-cover scale-x-[-1]"
        />
        {!status.cameraReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-center text-xs text-amber-200 px-3">
            <ShieldAlert className="mr-1 h-4 w-4" />
            Allow webcam for face monitoring
          </div>
        )}
      </div>

      <div className="space-y-1 px-3 py-2 text-[11px] text-gray-200">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1">
            <UserRound className="h-3 w-3" /> Faces
          </span>
          <span className="font-mono">{status.faceCount}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Violations</span>
          <span className="font-mono">{status.totalViolations}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Warnings</span>
          <span className="font-mono">{status.warningCount}</span>
        </div>
        <div className="text-[10px] text-gray-400">
          Model: {status.modelReady ? "BlazeFace / FaceDetector" : "focus-only fallback"}
        </div>
        {status.lastWarning && (
          <p className="rounded bg-amber-500/20 px-2 py-1 text-amber-100">{status.lastWarning}</p>
        )}
      </div>
    </div>
  );
}
