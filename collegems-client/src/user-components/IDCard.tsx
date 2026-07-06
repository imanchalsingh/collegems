import { useEffect, useMemo, useState } from "react";
import {
  IdCard,
  Download,
  Printer,
  ShieldCheck,
  Mail,
  Calendar,
  GraduationCap,
  Hash,
  AlertCircle,
  CheckCircle2,
  Hourglass,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import api from "../api/axios";

export interface Student {
  name?: string;
  email?: string;
  studentId?: string;
  course?: string;
  semester?: string | number;
  role?: string;
}

interface IDCardProps {
  student: Student;
}

interface IdCardMeta {
  validUntil: string;
  validityYears: number;
}

const getInitials = (name?: string) =>
  (name || "?")
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

const formatSemester = (semester?: string | number) => {
  if (semester === undefined || semester === null || semester === "") return "—";
  return `Semester ${semester}`;
};

const formatDate = (date: Date | string) =>
  new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatIssuedAt = () => formatDate(new Date());

export default function IDCard({ student }: IDCardProps) {
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [meta, setMeta] = useState<IdCardMeta | null>(null);

  const verifyUrl = useMemo(() => {
    if (!student?.studentId) return "";
    return `${window.location.origin}/verify/student/${encodeURIComponent(student.studentId)}`;
  }, [student?.studentId]);

  const isMissing = !student?.studentId || !student?.name;

  useEffect(() => {
    if (isMissing) return;
    let cancelled = false;
    api
      .get<IdCardMeta>("/student/idcard/me/data")
      .then((res) => {
        if (cancelled) return;
        if (res.data?.validUntil) {
          setMeta({
            validUntil: res.data.validUntil,
            validityYears: res.data.validityYears,
          });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn("Failed to load ID card validity metadata", err);
      });
    return () => {
      cancelled = true;
    };
  }, [isMissing]);

  const validUntilLabel = meta ? formatDate(meta.validUntil) : "—";

  const handleDownload = async () => {
    if (!student?.studentId) return;
    try {
      setDownloading(true);
      setMessage(null);
      const response = await api.get("/student/idcard/me/card", {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `id-card-${student.studentId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setMessage({ type: "success", text: "ID card downloaded successfully" });
    } catch (err) {
      console.error("ID card download failed:", err);
      setMessage({ type: "error", text: "Failed to download ID card. Please try again." });
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => window.print();

  if (isMissing) {
    return (
      <div className="bg-white rounded-xl border border-amber-200 p-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-medium text-amber-900">ID card not available yet</h3>
          <p className="text-sm text-amber-800 mt-1">
            Your student profile is incomplete. Please contact the administration office
            to complete your registration details.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <IdCard className="w-5 h-5 text-blue-600" />
            Digital Student ID Card
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Auto-generated from your student profile. Scan the QR code to verify.
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="w-4 h-4" />
            {downloading ? "Generating..." : "Download PDF"}
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`flex items-center gap-2 p-3 rounded-lg text-sm print:hidden ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {message.text}
        </div>
      )}

      <div className="flex justify-center">
        <div
          className="id-card relative w-[420px] h-[260px] rounded-2xl shadow-xl overflow-hidden text-white"
          style={{
            background:
              "linear-gradient(135deg, #1e3a8a 0%, #2563eb 55%, #0ea5e9 100%)",
          }}
        >
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-16 -left-12 w-44 h-44 rounded-full bg-white/5" />

          <div className="relative h-full p-4 flex flex-col">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-blue-100">
                  Smart College Management System
                </p>
                <p className="text-sm font-semibold mt-0.5">Student ID Card</p>
              </div>
              <ShieldCheck className="w-7 h-7 text-white/90" />
            </div>

            <div className="flex-1 mt-3 flex gap-4">
              <div className="flex flex-col items-center gap-2 flex-shrink-0">
                <div className="w-20 h-20 rounded-full bg-white/95 text-blue-700 flex items-center justify-center text-2xl font-bold shadow-lg ring-4 ring-white/30">
                  {getInitials(student.name)}
                </div>
              </div>

              <div className="flex-1 min-w-0 space-y-1.5">
                <div>
                  <p className="text-[9px] uppercase tracking-wide text-blue-200">
                    Name
                  </p>
                  <p className="text-base font-bold leading-tight truncate">
                    {student.name}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                  <div>
                    <p className="text-[9px] uppercase tracking-wide text-blue-200 flex items-center gap-1">
                      <Hash className="w-2.5 h-2.5" /> ID
                    </p>
                    <p className="text-xs font-semibold">{student.studentId}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wide text-blue-200 flex items-center gap-1">
                      <GraduationCap className="w-2.5 h-2.5" /> Course
                    </p>
                    <p className="text-xs font-semibold truncate">
                      {student.course || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wide text-blue-200 flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5" /> Semester
                    </p>
                    <p className="text-xs font-semibold">
                      {formatSemester(student.semester)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wide text-blue-200 flex items-center gap-1">
                      <Mail className="w-2.5 h-2.5" /> Email
                    </p>
                    <p className="text-xs font-semibold truncate">
                      {student.email}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <div className="bg-white p-1.5 rounded-md shadow-md">
                  <QRCodeSVG
                    value={verifyUrl}
                    size={88}
                    level="M"
                    bgColor="#ffffff"
                    fgColor="#0f172a"
                  />
                </div>
                <p className="text-[8px] text-blue-100 text-center leading-tight">
                  Scan to verify
                </p>
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-white/20 flex items-center justify-between text-[9px] text-blue-100">
              <span>Issued: {formatIssuedAt()}</span>
              <span>Valid until: {validUntilLabel}</span>
            </div>
          </div>
        </div>
      </div>

      {meta && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-900 text-sm print:hidden">
          <Hourglass className="w-4 h-4 flex-shrink-0" />
          <span>
            Valid for <span className="font-semibold">{meta.validityYears} year{meta.validityYears === 1 ? "" : "s"}</span>
            {student?.course ? <> based on the <span className="font-medium">{student.course}</span> program</> : " (minimum validity)"}
            {" "}&middot; expires <span className="font-medium">{validUntilLabel}</span>
          </span>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-900 print:hidden">
        <p className="font-medium mb-1">About your digital ID card</p>
        <ul className="list-disc list-inside space-y-0.5 text-blue-800">
          <li>Auto-generated from your registered student profile</li>
          <li>Validity is set to your program's duration, with a 2-year minimum</li>
          <li>Download as a printable PDF for offline use</li>
          <li>QR code links to a public verification page with live status</li>
          <li>Update your profile details from the administration office if anything is incorrect</li>
        </ul>
      </div>
    </div>
  );
}
