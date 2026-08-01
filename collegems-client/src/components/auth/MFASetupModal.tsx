import { useEffect, useState } from "react";
import { Shield, Copy, Check, X, KeyRound } from "lucide-react";
import api from "../../api/axios";
import { useToast } from "../../hooks/useToast";

type Props = {
  open: boolean;
  onClose: () => void;
  onEnabled?: () => void;
};

export default function MFASetupModal({ open, onClose, onEnabled }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState<"scan" | "verify" | "codes">("scan");
  const [loading, setLoading] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [token, setToken] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep("scan");
    setToken("");
    setRecoveryCodes([]);
    setCopied(false);
    void startSetup();
  }, [open]);

  const startSetup = async () => {
    setLoading(true);
    try {
      const res = await api.post("/mfa/setup");
      setQrCodeDataUrl(res.data.qrCodeDataUrl || "");
      setSecret(res.data.secret || "");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Unable to start MFA setup");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const confirmSetup = async () => {
    if (!token.trim()) {
      toast.warning("Enter the 6-digit code from your authenticator app");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/mfa/verify-setup", { token: token.trim() });
      setRecoveryCodes(res.data.recoveryCodes || []);
      setStep("codes");
      toast.success("MFA enabled");
      onEnabled?.();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Invalid authenticator code");
    } finally {
      setLoading(false);
    }
  };

  const copyCodes = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join("\n"));
      setCopied(true);
      toast.success("Recovery codes copied");
    } catch {
      toast.error("Could not copy codes");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mfa-setup-title"
        className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-blue-50 p-2 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 id="mfa-setup-title" className="text-lg font-semibold text-gray-900 dark:text-white">
                Set up authenticator MFA
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Pair Google Authenticator, Authy, or any TOTP app.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
            aria-label="Close MFA setup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading && step === "scan" && (
          <p className="py-8 text-center text-sm text-gray-500">Generating secure QR code…</p>
        )}

        {step === "scan" && !loading && (
          <div className="space-y-4">
            {qrCodeDataUrl ? (
              <img
                src={qrCodeDataUrl}
                alt="MFA QR code for authenticator pairing"
                className="mx-auto h-48 w-48 rounded-lg border border-gray-100 bg-white p-2"
              />
            ) : null}
            <p className="text-center text-xs text-gray-500 dark:text-gray-400">
              Or enter this secret manually:
            </p>
            <code className="block break-all rounded-lg bg-gray-50 px-3 py-2 text-center text-sm text-gray-800 dark:bg-gray-800 dark:text-gray-100">
              {secret}
            </code>
            <button
              type="button"
              onClick={() => setStep("verify")}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Continue
            </button>
          </div>
        )}

        {step === "verify" && (
          <div className="space-y-4">
            <label className="block space-y-1 text-sm text-gray-600 dark:text-gray-300">
              6-digit code
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="123456"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep("scan")}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Back
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void confirmSetup()}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? "Verifying…" : "Enable MFA"}
              </button>
            </div>
          </div>
        )}

        {step === "codes" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
              <KeyRound className="h-4 w-4 shrink-0" />
              Save these 8-digit recovery codes. Each works once.
            </div>
            <ul className="grid grid-cols-2 gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-sm dark:border-gray-700 dark:bg-gray-800">
              {recoveryCodes.map((code) => (
                <li key={code} className="text-center text-gray-900 dark:text-gray-100">
                  {code}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => void copyCodes()}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy codes"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
