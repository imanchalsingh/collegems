import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  CloudOff,
  CloudUpload,
  Loader2,
  MapPin,
  Shield,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Scanner } from "@yudiel/react-qr-scanner";
import api from "../api/axios";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import {
  enqueueOfflineScan,
  listOfflineScans,
  removeOfflineScans,
  countOfflineScans,
} from "../utils/qrAttendanceOfflineQueue";
import { getOrCreateDeviceFingerprint } from "../utils/qrTotpClient";

interface ScanResult {
  type: "success" | "error" | "info";
  text: string;
}

function parseQrPayload(raw: string): { sessionId: string; totpCode: string } | null {
  try {
    const data = JSON.parse(raw);
    if (data?.sid && data?.otp) {
      return { sessionId: String(data.sid), totpCode: String(data.otp) };
    }
  } catch {
    // allow sid:otp fallback
    const parts = raw.split(":");
    if (parts.length === 2) {
      return { sessionId: parts[0], totpCode: parts[1] };
    }
  }
  return null;
}

function readGeo(): Promise<{ lat: number; lng: number; accuracyM?: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyM: pos.coords.accuracy,
        }),
      (err) => reject(new Error(err.message || "Location denied")),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 }
    );
  });
}

export default function QRAttendanceScanner() {
  const isOnline = useNetworkStatus();
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const lockRef = useRef(false);
  const fingerprint = useRef(getOrCreateDeviceFingerprint());

  const refreshPending = useCallback(async () => {
    try {
      setPendingCount(await countOfflineScans());
    } catch {
      setPendingCount(0);
    }
  }, []);

  const flushQueue = useCallback(async () => {
    if (!navigator.onLine) return;
    const scans = await listOfflineScans();
    if (!scans.length) {
      await refreshPending();
      return;
    }
    try {
      const res = await api.post<{
        results: { clientScanId: string; status: string; reason?: string | null }[];
      }>("/attendance/sessions/sync", { scans });
      const done = (res.data.results || [])
        .filter((r) => r.status === "accepted" || r.status === "duplicate" || r.status === "rejected")
        .map((r) => r.clientScanId);
      await removeOfflineScans(done);
      const accepted = (res.data.results || []).filter((r) => r.status === "accepted").length;
      setResult({
        type: "info",
        text: `Synced ${done.length} queued scan(s); ${accepted} newly accepted.`,
      });
    } catch {
      setResult({ type: "error", text: "Offline sync failed — will retry later." });
    } finally {
      await refreshPending();
    }
  }, [refreshPending]);

  useEffect(() => {
    refreshPending();
  }, [refreshPending]);

  useEffect(() => {
    if (isOnline) {
      flushQueue();
    }
  }, [isOnline, flushQueue]);

  const handleScan = async (detected: { rawValue?: string }[]) => {
    if (lockRef.current || busy) return;
    const raw = detected?.[0]?.rawValue;
    if (!raw) return;

    const parsed = parseQrPayload(raw);
    if (!parsed) {
      setResult({ type: "error", text: "Unrecognized QR payload" });
      return;
    }

    lockRef.current = true;
    setBusy(true);
    setResult(null);

    try {
      const geo = await readGeo();
      const payload = {
        sessionId: parsed.sessionId,
        totpCode: parsed.totpCode,
        scannedAt: new Date().toISOString(),
        geo,
        deviceFingerprint: fingerprint.current,
      };

      if (!navigator.onLine) {
        const clientScanId = crypto.randomUUID();
        await enqueueOfflineScan({ clientScanId, ...payload });
        await refreshPending();
        setResult({
          type: "info",
          text: "You are offline — scan queued in IndexedDB and will sync when online.",
        });
        setScanning(false);
        return;
      }

      const res = await api.post<{
        data: { status: string; duplicate?: boolean };
      }>("/attendance/sessions/scan", payload);

      setResult({
        type: "success",
        text: res.data.data.duplicate
          ? "Already marked present for this class today."
          : "Attendance marked present!",
      });
      setScanning(false);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } }; message?: string };
      // Network failure mid-flight → queue for offline sync
      if (!ax.response) {
        try {
          const geo = await readGeo();
          await enqueueOfflineScan({
            clientScanId: crypto.randomUUID(),
            sessionId: parsed.sessionId,
            totpCode: parsed.totpCode,
            scannedAt: new Date().toISOString(),
            geo,
            deviceFingerprint: fingerprint.current,
          });
          await refreshPending();
          setResult({
            type: "info",
            text: "Network dropped — scan saved offline.",
          });
          setScanning(false);
          return;
        } catch {
          /* fall through */
        }
      }
      setResult({
        type: "error",
        text: ax.response?.data?.message || ax.message || "Scan failed",
      });
    } finally {
      setBusy(false);
      // brief cooldown so the same QR frame isn't double-submitted
      setTimeout(() => {
        lockRef.current = false;
      }, 2500);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-600" />
            QR Attendance Scanner
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Scan the classroom TOTP QR. Location and device fingerprint are verified.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {!isOnline ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-amber-300 bg-amber-50 text-amber-800">
              <CloudOff className="w-3 h-3" /> Offline
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-emerald-300 bg-emerald-50 text-emerald-800">
              Online
            </span>
          )}
          {pendingCount > 0 && (
            <button
              type="button"
              onClick={flushQueue}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-blue-300 bg-blue-50 text-blue-800"
            >
              <CloudUpload className="w-3 h-3" />
              {pendingCount} queued
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-400">
        <span className="inline-flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" /> Geofence required
        </span>
        <span className="inline-flex items-center gap-1">
          <Shield className="w-3.5 h-3.5" /> Anti-proxy fingerprint
        </span>
      </div>

      {result && (
        <div
          className={`rounded-lg border px-3 py-2 text-sm flex gap-2 items-start ${
            result.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : result.type === "error"
                ? "border-red-200 bg-red-50 text-red-900"
                : "border-slate-200 bg-slate-50 text-slate-800"
          }`}
        >
          {result.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : result.type === "error" ? (
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <CloudOff className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span>{result.text}</span>
        </div>
      )}

      {!scanning ? (
        <button
          type="button"
          onClick={() => {
            setResult(null);
            setScanning(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
        >
          <Camera className="w-4 h-4" />
          Open camera scanner
        </button>
      ) : (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden max-w-md">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-800">
            <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
              Point at the classroom QR
            </span>
            <button
              type="button"
              onClick={() => setScanning(false)}
              className="text-sm text-gray-500 hover:text-gray-800"
            >
              Close
            </button>
          </div>
          <div className="relative aspect-square bg-black">
            {busy && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 text-white">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            )}
            <Scanner
              onScan={handleScan}
              styles={{ container: { width: "100%", height: "100%" } }}
              constraints={{ facingMode: "environment" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
