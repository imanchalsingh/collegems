import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import api from "../../api/axios";
import { useToast } from "../../hooks/useToast";

type LoginUser = {
  id: string;
  name?: string;
  email?: string;
  role: string;
  [key: string]: unknown;
};

type Props = {
  mfaToken: string;
  onSuccess: (payload: { accessToken: string; user: LoginUser }) => void;
  onCancel: () => void;
};

export default function MFAVerifyStep({ mfaToken, onSuccess, onCancel }: Props) {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const verify = async () => {
    if (!code.trim()) {
      toast.warning("Enter your authenticator or recovery code");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/auth/mfa/verify", {
        mfaToken,
        token: code.trim(),
      });
      onSuccess({ accessToken: res.data.accessToken, user: res.data.user });
    } catch (err: any) {
      toast.error(err.response?.data?.message || "MFA verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center text-center">
        <div className="mb-3 rounded-xl bg-emerald-50 p-3 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Two-factor verification
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Enter the 6-digit code from your authenticator app, or an 8-digit recovery code.
        </p>
      </div>

      <label className="block space-y-1 text-sm text-gray-600 dark:text-gray-300">
        Authentication code
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void verify();
          }}
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-center text-lg tracking-widest text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          placeholder="123456"
          aria-label="MFA authentication code"
        />
      </label>

      <button
        type="button"
        disabled={loading}
        onClick={() => void verify()}
        className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {loading ? "Verifying…" : "Verify and continue"}
      </button>

      <button
        type="button"
        onClick={onCancel}
        className="w-full text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
      >
        Back to password
      </button>
    </div>
  );
}
