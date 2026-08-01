import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/library";
import { Camera, Keyboard, X } from "lucide-react";

interface BarcodeScannerModalProps {
  open: boolean;
  onClose: () => void;
  onDetected: (code: string) => void;
  title?: string;
}

export default function BarcodeScannerModal({
  open,
  onClose,
  onDetected,
  title = "Scan barcode / ISBN",
}: BarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  const [manual, setManual] = useState("");
  const [usingCamera, setUsingCamera] = useState(true);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    if (!open || !usingCamera) return;

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    let active = true;

    (async () => {
      try {
        setError("");
        const devices = await reader.listVideoInputDevices();
        const deviceId = devices[0]?.deviceId;
        if (!deviceId) {
          setError("No camera found. Use manual / USB keyboard wedge entry below.");
          setUsingCamera(false);
          return;
        }
        await reader.decodeFromVideoDevice(deviceId, videoRef.current!, (result, err) => {
          if (!active) return;
          if (result) {
            const text = result.getText();
            if (text) {
              onDetected(text.trim());
              onClose();
            }
          }
          // ignore NotFoundException noise
          if (err && err.name !== "NotFoundException") {
            // keep scanning
          }
        });
      } catch (err: any) {
        setError(err?.message || "Camera permission denied. Enter code manually.");
        setUsingCamera(false);
      }
    })();

    return () => {
      active = false;
      try {
        reader.reset();
      } catch {
        /* ignore */
      }
      readerRef.current = null;
    };
  }, [open, usingCamera, onClose, onDetected]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-4 shadow-xl dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 dark:text-white">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {error}
          </div>
        )}

        {usingCamera ? (
          <div className="overflow-hidden rounded-lg bg-black">
            <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-600">
            Camera unavailable — USB scanners that type digits + Enter work in the field below.
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setUsingCamera(true)}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-600"
          >
            <Camera className="h-3.5 w-3.5" /> Camera
          </button>
          <button
            type="button"
            onClick={() => setUsingCamera(false)}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-600"
          >
            <Keyboard className="h-3.5 w-3.5" /> Manual / USB
          </button>
        </div>

        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!manual.trim()) return;
            onDetected(manual.trim());
            onClose();
          }}
        >
          <input
            autoFocus={!usingCamera}
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="ISBN / barcode"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
          />
          <button
            type="submit"
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white"
          >
            Use
          </button>
        </form>
      </div>
    </div>
  );
}
