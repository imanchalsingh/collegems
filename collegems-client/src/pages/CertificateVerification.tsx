import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ShieldCheck,
  ShieldAlert,
  Loader2,
  ArrowLeft,
  Hash,
  GraduationCap,
  User,
  Calendar,
  AlertTriangle,
  FileDown,
} from "lucide-react";
import api from "../api/axios";

type Grade = {
  subject: string;
  code?: string;
  grade: string;
  credits?: number | null;
};

type VerifyResult = {
  valid: boolean;
  certId?: string;
  type?: string;
  studentName?: string;
  studentId?: string;
  course?: string;
  department?: string;
  semester?: string;
  cgpa?: string;
  degreeTitle?: string;
  grades?: Grade[];
  issuedAt?: string;
  merkleRoot?: string;
  recordHash?: string;
  algorithm?: string;
  publicKeyFingerprint?: string;
  merkleMatches?: boolean;
  signatureValid?: boolean;
  tampered?: boolean;
  tamperedFields?: string[];
  revoked?: boolean;
  message?: string;
  verifiedAt?: string;
};

export default function CertificateVerification() {
  const { certId } = useParams<{ certId: string }>();
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [data, setData] = useState<VerifyResult | null>(null);
  const [tamperCgpa, setTamperCgpa] = useState("");
  const [tamperResult, setTamperResult] = useState<{
    tampered?: boolean;
    alert?: string | null;
    tamperedFields?: string[];
  } | null>(null);
  const [checkingTamper, setCheckingTamper] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!certId) {
        setState("error");
        return;
      }
      try {
        const res = await api.get<VerifyResult>(
          `/verify-certificate/${encodeURIComponent(certId)}`,
        );
        if (cancelled) return;
        setData(res.data);
        setTamperCgpa(res.data.cgpa || "");
        setState("ready");
      } catch (err: any) {
        if (cancelled) return;
        setData(err.response?.data || { valid: false, message: "Certificate not found" });
        setState("ready");
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [certId]);

  const status = useMemo(() => {
    if (!data) return "unknown";
    if (data.revoked) return "revoked";
    if (data.valid) return "valid";
    if (data.tampered) return "tampered";
    return "invalid";
  }, [data]);

  const runTamperDemo = async () => {
    if (!certId || !data) return;
    setCheckingTamper(true);
    setTamperResult(null);
    try {
      const claimedPayload = {
        ...(data as object),
        certId: data.certId,
        studentId: data.studentId,
        studentName: data.studentName,
        course: data.course,
        department: data.department,
        semester: data.semester,
        cgpa: tamperCgpa,
        degreeTitle: data.degreeTitle,
        grades: data.grades,
        issuedAt: data.issuedAt,
      };
      const res = await api.post(
        `/verify-certificate/${encodeURIComponent(certId)}/tamper-check`,
        { claimedPayload },
      );
      setTamperResult(res.data);
    } catch (err: any) {
      setTamperResult({
        tampered: true,
        alert: err.response?.data?.message || "Tamper check failed",
      });
    } finally {
      setCheckingTamper(false);
    }
  };

  const pdfUrl = certId
    ? `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000/api"}/verify-certificate/${encodeURIComponent(certId)}/pdf`
    : "#";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          to="/login"
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
          <div
            className={`px-6 py-5 text-white ${
              status === "valid"
                ? "bg-emerald-600"
                : status === "tampered" || status === "revoked"
                  ? "bg-red-600"
                  : status === "invalid"
                    ? "bg-amber-600"
                    : "bg-slate-700"
            }`}
          >
            <div className="flex items-center gap-3">
              {state === "loading" ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : status === "valid" ? (
                <ShieldCheck className="h-8 w-8" />
              ) : (
                <ShieldAlert className="h-8 w-8" />
              )}
              <div>
                <h1 className="text-xl font-semibold">Certificate verification</h1>
                <p className="text-sm text-white/90">
                  {state === "loading"
                    ? "Checking cryptographic seal…"
                    : data?.message || "Verification complete"}
                </p>
              </div>
            </div>
          </div>

          {state === "ready" && data && (
            <div className="space-y-5 p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <Info icon={Hash} label="Certificate ID" value={data.certId || certId || "—"} />
                <Info icon={User} label="Student" value={data.studentName || "—"} />
                <Info icon={GraduationCap} label="Course / Degree" value={data.degreeTitle || data.course || "—"} />
                <Info
                  icon={Calendar}
                  label="Issued"
                  value={data.issuedAt ? new Date(data.issuedAt).toLocaleString() : "—"}
                />
              </div>

              {(data.studentId || data.cgpa || data.semester) && (
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700">
                  <p>Student ID: {data.studentId || "—"}</p>
                  {data.department && <p>Department: {data.department}</p>}
                  {data.semester && <p>Semester: {data.semester}</p>}
                  {data.cgpa && <p>CGPA: {data.cgpa}</p>}
                  <p className="mt-2 text-xs text-gray-500">
                    Signature: {data.signatureValid ? "valid" : "invalid"} · Merkle:{" "}
                    {data.merkleMatches ? "matches" : "mismatch"} · {data.algorithm}
                  </p>
                  {data.merkleRoot && (
                    <p className="mt-1 break-all font-mono text-[11px] text-gray-500">
                      Root {data.merkleRoot}
                    </p>
                  )}
                </div>
              )}

              {data.grades && data.grades.length > 0 && (
                <div>
                  <h2 className="mb-2 text-sm font-semibold text-gray-900">Grades</h2>
                  <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100">
                    {data.grades.map((g, i) => (
                      <li key={`${g.subject}-${i}`} className="flex justify-between px-3 py-2 text-sm">
                        <span className="text-gray-700">
                          {g.code ? `${g.code} · ` : ""}
                          {g.subject}
                        </span>
                        <span className="font-medium text-gray-900">{g.grade}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.valid && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-900">
                    <AlertTriangle className="h-4 w-4" />
                    Tamper detection demo
                  </div>
                  <p className="mb-3 text-xs text-amber-800">
                    Change a sealed field (e.g. CGPA) and re-check. Altered values fail the Merkle seal.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      value={tamperCgpa}
                      onChange={(e) => setTamperCgpa(e.target.value)}
                      className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm"
                      placeholder="Claimed CGPA"
                    />
                    <button
                      type="button"
                      disabled={checkingTamper}
                      onClick={() => void runTamperDemo()}
                      className="rounded-lg bg-amber-700 px-3 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-60"
                    >
                      {checkingTamper ? "Checking…" : "Check for tampering"}
                    </button>
                  </div>
                  {tamperResult && (
                    <p
                      className={`mt-3 text-sm ${
                        tamperResult.tampered ? "text-red-700" : "text-emerald-700"
                      }`}
                    >
                      {tamperResult.alert ||
                        (tamperResult.tampered
                          ? `Tamper alert: ${tamperResult.tamperedFields?.join(", ") || "fields changed"}`
                          : "No tampering detected")}
                    </p>
                  )}
                </div>
              )}

              <a
                href={pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <FileDown className="h-4 w-4" />
                Open sealed PDF
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Hash;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-gray-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}
