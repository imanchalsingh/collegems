import { useCallback, useEffect, useState } from "react";
import { Shield } from "lucide-react";
import api from "../../api/axios";
import { useToast } from "../../hooks/useToast";
import MFASetupModal from "./MFASetupModal";

type MfaStatus = {
  mfaEnabled: boolean;
  recoveryCodesRemaining: number;
  enrollmentRequired: boolean;
  enforcedForRole: boolean;
};

export default function MFASecurityPanel() {
  const { toast } = useToast();
  const [status, setStatus] = useState<MfaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupOpen, setSetupOpen] = useState(false);
  const [disableToken, setDisableToken] = useState("");
  const [busy, setBusy] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/mfa/status");
      setStatus(res.data);
    } catch (err: any) {
      console.error(err);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const disableMfa = async () => {
    if (!disableToken.trim()) {
      toast.warning("Enter a TOTP or recovery code to disable MFA");
      return;
    }
    setBusy(true);
    try {
      await api.post("/mfa/disable", { token: disableToken.trim() });
      toast.success("MFA disabled");
      setDisableToken("");
      await loadStatus();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Could not disable MFA");
    } finally {
      setBusy(false);
    }
  };

  const regenerate = async () => {
    const token = window.prompt("Enter your current authenticator code to regenerate recovery codes");
    if (!token) return;
    setBusy(true);
    try {
      const res = await api.post("/mfa/recovery-codes", { token: token.trim() });
      const codes = (res.data.recoveryCodes || []).join("\n");
      window.alert(`Save these new recovery codes:\n\n${codes}`);
      await loadStatus();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Could not regenerate codes");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Multi-factor authentication</h2>
            <p className="text-sm text-gray-500">
              Protect your account with an authenticator app and recovery codes.
            </p>
          </div>
        </div>
        {!loading && status && !status.mfaEnabled && (
          <button
            type="button"
            onClick={() => setSetupOpen(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Enable MFA
          </button>
        )}
      </div>

      {loading && <p className="text-sm text-gray-500">Loading MFA status…</p>}

      {!loading && status && (
        <div className="space-y-3 text-sm text-gray-700">
          <p>
            Status:{" "}
            <span className={status.mfaEnabled ? "font-medium text-emerald-700" : "font-medium text-amber-700"}>
              {status.mfaEnabled ? "Enabled" : "Not enabled"}
            </span>
          </p>
          {status.enrollmentRequired && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
              MFA enrollment is required for your role.
            </p>
          )}
          {status.mfaEnabled && (
            <>
              <p>Recovery codes remaining: {status.recoveryCodesRemaining}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void regenerate()}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50"
                >
                  Regenerate recovery codes
                </button>
              </div>
              {!status.enforcedForRole && (
                <div className="mt-4 grid gap-2 border-t border-gray-100 pt-4 md:grid-cols-[1fr_auto]">
                  <input
                    type="text"
                    value={disableToken}
                    onChange={(e) => setDisableToken(e.target.value)}
                    placeholder="TOTP or recovery code to disable"
                    className="rounded-lg border border-gray-200 px-3 py-2"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void disableMfa()}
                    className="rounded-lg border border-red-200 px-3 py-2 text-red-700 hover:bg-red-50"
                  >
                    Disable MFA
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <MFASetupModal
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        onEnabled={() => {
          void loadStatus();
        }}
      />
    </section>
  );
}
