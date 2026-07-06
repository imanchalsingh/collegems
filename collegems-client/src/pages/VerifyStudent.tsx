import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { CheckCircle2, XCircle, IdCard, Loader2, ArrowLeft, Mail, GraduationCap, Calendar, Hash } from "lucide-react";
import { isAxiosError } from "axios";
import api from "../api/axios";
import { extractArray } from "../utils/apiHelpers";

interface VerifiedStudent {
  name?: string;
  studentId?: string;
  course?: string;
  semester?: string | number;
  email?: string;
}

interface VerifyResponse {
  valid: boolean;
  verifiedAt?: string;
  student?: VerifiedStudent;
  message?: string;
}

const formatSemester = (semester?: string | number) => {
  if (semester === undefined || semester === null || semester === "") return "—";
  return `Semester ${semester}`;
};

export default function VerifyStudent() {
  const { studentId } = useParams<{ studentId: string }>();
  const [state, setState] = useState<"loading" | "valid" | "invalid" | "error">("loading");
  const [data, setData] = useState<VerifyResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!studentId) {
        setState("invalid");
        return;
      }
      try {
        const response = await api.get<VerifyResponse>(
          `/verify/student/${encodeURIComponent(studentId)}`,
        );
        if (cancelled) return;
        setData(response.data);
        setState(response.data.valid ? "valid" : "invalid");
      } catch (err: unknown) {
        if (cancelled) return;
        if (isAxiosError(err) && err.response?.status === 404) {
          setState("invalid");
        } else {
          setState("error");
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div
            className={`p-6 text-white ${
              state === "valid"
                ? "bg-gradient-to-r from-green-600 to-emerald-600"
                : state === "invalid" || state === "error"
                ? "bg-gradient-to-r from-red-600 to-rose-600"
                : "bg-gradient-to-r from-blue-700 to-indigo-700"
            }`}
          >
            <div className="flex items-center gap-3">
              {state === "loading" && <Loader2 className="w-7 h-7 animate-spin" />}
              {state === "valid" && <CheckCircle2 className="w-7 h-7" />}
              {(state === "invalid" || state === "error") && <XCircle className="w-7 h-7" />}
              <div>
                <h1 className="text-lg font-bold">
                  {state === "loading" && "Verifying ID..."}
                  {state === "valid" && "ID Verified"}
                  {state === "invalid" && "ID Not Found"}
                  {state === "error" && "Verification Error"}
                </h1>
                <p className="text-sm opacity-90">
                  {state === "loading" && "Checking college records..."}
                  {state === "valid" && "This student ID is currently valid."}
                  {state === "invalid" && "No matching student record was found."}
                  {state === "error" && "Something went wrong. Please try again later."}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {state === "valid" && data?.student && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
                  <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xl font-bold flex-shrink-0">
                    {(data.student.name || "?")
                      .trim()
                      .split(/\s+/)
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-gray-900 truncate">
                      {data.student.name}
                    </h2>
                    <p className="text-sm text-gray-500">Active Student</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                    <Hash className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Student ID</p>
                      <p className="font-medium text-gray-900">{data.student.studentId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                    <GraduationCap className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Course</p>
                      <p className="font-medium text-gray-900">{data.student.course || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Semester</p>
                      <p className="font-medium text-gray-900">{formatSemester(data.student.semester)}</p>
                    </div>
                  </div>
                  {data.student.email && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="font-medium text-gray-900 truncate">{data.student.email}</p>
                      </div>
                    </div>
                  )}
                </div>

                {data.verifiedAt && (
                  <p className="text-xs text-gray-400 text-center pt-2">
                    Verified at {new Date(data.verifiedAt).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            {state === "invalid" && (
              <div className="text-center py-6">
                <IdCard className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  The ID <span className="font-mono font-semibold">{studentId}</span> does not
                  match any active student record.
                </p>
              </div>
            )}

            {state === "error" && (
              <div className="text-center py-6">
                <p className="text-sm text-gray-600">
                  We could not reach the verification service. Please try again in a moment.
                </p>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Powered by Smart College Management System
        </p>
      </div>
    </div>
  );
}
