import { useCallback, useEffect, useState } from "react";
import {
  QrCode,
  MapPin,
  Radio,
  StopCircle,
  Users,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import api from "../api/axios";
import { extractArray } from "../utils/apiHelpers";
import { useSocket } from "../context/SocketContext";
import { generateClientTotp, msUntilNextWindow } from "../utils/qrTotpClient";

interface Course {
  _id: string;
  name: string;
  code: string;
  teacher?: string | { _id: string };
}

interface SessionData {
  sessionId: string;
  courseId: string;
  courseName: string;
  date: string;
  totpSecret: string;
  totpPeriodSeconds: number;
  room: string;
  geo: { lat: number; lng: number; radiusMeters: number };
  endsAt: string;
}

interface MarkEvent {
  sessionId: string;
  studentId: string;
  name?: string;
  method: string;
  at: string;
}

export default function DynamicClassroomQR() {
  const { socket, isConnected } = useSocket();
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState("");
  const [radiusMeters, setRadiusMeters] = useState(100);
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [session, setSession] = useState<SessionData | null>(null);
  const [qrValue, setQrValue] = useState("");
  const [countdownMs, setCountdownMs] = useState(5000);
  const [marks, setMarks] = useState<MarkEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/courses/all");
        const allCourses = extractArray(res.data) as Course[];
        const teacherId = localStorage.getItem("userId");
        const list = teacherId
          ? allCourses.filter((c) => {
              const id = typeof c.teacher === "string" ? c.teacher : c.teacher?._id;
              return id === teacherId;
            })
          : allCourses;
        setCourses(list);
        if (list[0]) setCourseId(list[0]._id);
      } catch {
        setMessage("Could not load courses");
      }
    })();
  }, []);

  const refreshQr = useCallback(async () => {
    if (!session) return;
    try {
      const otp = await generateClientTotp(
        session.totpSecret,
        Date.now(),
        session.totpPeriodSeconds
      );
      const payload = {
        v: 1,
        sid: session.sessionId,
        otp,
        ts: Math.floor(Date.now() / 1000),
      };
      setQrValue(JSON.stringify(payload));
      setCountdownMs(msUntilNextWindow(Date.now(), session.totpPeriodSeconds));
    } catch {
      // Fallback: ask server for payload
      try {
        const res = await api.get<{
          data: { qrValue: string; expiresInMs: number };
        }>(`/attendance/sessions/${session.sessionId}/qr`);
        setQrValue(res.data.data.qrValue);
        setCountdownMs(res.data.data.expiresInMs);
      } catch {
        setMessage("Failed to refresh QR code");
      }
    }
  }, [session]);

  useEffect(() => {
    if (!session) return;
    refreshQr();
    const tick = setInterval(() => {
      setCountdownMs((ms) => {
        if (ms <= 200) {
          refreshQr();
          return session.totpPeriodSeconds * 1000;
        }
        return ms - 200;
      });
    }, 200);
    return () => clearInterval(tick);
  }, [session, refreshQr]);

  useEffect(() => {
    if (!socket || !session) return;
    socket.emit("attendance:join", { sessionId: session.sessionId });

    const onMarked = (ev: MarkEvent) => {
      setMarks((prev) => [ev, ...prev].slice(0, 40));
    };
    const onEnded = () => {
      setMessage("Session ended");
      setSession(null);
      setQrValue("");
    };

    socket.on("attendance:marked", onMarked);
    socket.on("attendance:session_ended", onEnded);
    return () => {
      socket.emit("attendance:leave", { sessionId: session.sessionId });
      socket.off("attendance:marked", onMarked);
      socket.off("attendance:session_ended", onEnded);
    };
  }, [socket, session]);

  const startSession = () => {
    if (!courseId) {
      setMessage("Select a course first");
      return;
    }
    setGeoError(null);
    setMessage(null);
    setLoading(true);

    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported in this browser");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await api.post<{ data: SessionData }>("/attendance/sessions", {
            courseId,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            radiusMeters,
            durationMinutes,
          });
          setSession(res.data.data);
          setMarks([]);
          setMessage("Live QR session started — project this screen");
        } catch (err: unknown) {
          const ax = err as { response?: { data?: { message?: string } } };
          setMessage(ax.response?.data?.message || "Failed to start session");
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setGeoError(err.message || "Location permission denied");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const endSession = async () => {
    if (!session) return;
    setLoading(true);
    try {
      await api.post(`/attendance/sessions/${session.sessionId}/end`);
      setSession(null);
      setQrValue("");
      setMessage("Session ended");
    } catch {
      setMessage("Failed to end session");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <QrCode className="w-5 h-5 text-emerald-600" />
            Dynamic Classroom QR
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            5-second TOTP QR with geofence — students must be in the room to mark present.
          </p>
        </div>
        <span
          className={`text-xs px-2 py-1 rounded-full border ${
            isConnected
              ? "border-emerald-300 text-emerald-700 bg-emerald-50"
              : "border-amber-300 text-amber-700 bg-amber-50"
          }`}
        >
          <Radio className="w-3 h-3 inline mr-1" />
          {isConnected ? "Live" : "Socket offline"}
        </span>
      </div>

      {message && (
        <div className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-slate-700 dark:text-slate-200">
          {message}
        </div>
      )}
      {geoError && (
        <div className="text-sm rounded-lg border border-red-200 bg-red-50 text-red-800 px-3 py-2">
          {geoError}
        </div>
      )}

      {!session ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="block text-sm">
              <span className="text-gray-600 dark:text-gray-300">Course</span>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2"
              >
                {courses.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-gray-600 dark:text-gray-300">
                Geofence radius (m)
              </span>
              <input
                type="number"
                min={10}
                max={2000}
                value={radiusMeters}
                onChange={(e) => setRadiusMeters(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-600 dark:text-gray-300">Duration (min)</span>
              <input
                type="number"
                min={5}
                max={180}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={startSession}
            disabled={loading || !courseId}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
            Start live QR session
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 flex flex-col items-center">
            <p className="text-sm text-gray-500 mb-2">
              {session.courseName} · refreshes every {session.totpPeriodSeconds}s
            </p>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              {qrValue ? (
                <QRCodeSVG value={qrValue} size={280} level="M" includeMargin />
              ) : (
                <div className="w-[280px] h-[280px] flex items-center justify-center text-gray-400">
                  <RefreshCw className="w-8 h-8 animate-spin" />
                </div>
              )}
            </div>
            <div className="mt-4 w-full max-w-xs">
              <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-200"
                  style={{
                    width: `${Math.max(
                      0,
                      (countdownMs / (session.totpPeriodSeconds * 1000)) * 100
                    )}%`,
                  }}
                />
              </div>
              <p className="text-xs text-center text-gray-500 mt-2">
                Next rotate in {(countdownMs / 1000).toFixed(1)}s · radius{" "}
                {session.geo.radiusMeters}m
              </p>
            </div>
            <button
              type="button"
              onClick={endSession}
              disabled={loading}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <StopCircle className="w-4 h-4" />
              End session
            </button>
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
            <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2 mb-3">
              <Users className="w-4 h-4" />
              Live check-ins ({marks.length})
            </h3>
            {marks.length === 0 ? (
              <p className="text-sm text-gray-500">Waiting for students to scan…</p>
            ) : (
              <ul className="space-y-2 max-h-80 overflow-y-auto">
                {marks.map((m, i) => (
                  <li
                    key={`${m.studentId}-${m.at}-${i}`}
                    className="text-sm flex justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-2"
                  >
                    <span className="font-medium text-gray-800 dark:text-gray-100">
                      {m.name || m.studentId.slice(-6)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {m.method} · {new Date(m.at).toLocaleTimeString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
