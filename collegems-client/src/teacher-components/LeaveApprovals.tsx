import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  MessageSquare,
  RefreshCw,
  Search,
  User,
  XCircle,
} from "lucide-react";
import api from "../api/axios";
import { extractArray } from "../utils/apiHelpers";

type LeaveStatus = "Pending" | "Approved" | "Rejected";

interface LeaveApplication {
  _id: string;
  subject: string;
  startDate: string;
  endDate: string;
  reason: string;
  type: string;
  status: LeaveStatus;
  adminRemarks?: string;
  reviewedAt?: string;
  createdAt: string;
  user?: {
    name?: string;
    email?: string;
    studentId?: string;
    course?: string;
    semester?: string | number;
    role?: string;
  };
  reviewedBy?: {
    name?: string;
    email?: string;
  };
}

const statusOptions: Array<"all" | LeaveStatus> = [
  "all",
  "Pending",
  "Approved",
  "Rejected",
];

export default function LeaveApprovals() {
  const [applications, setApplications] = useState<LeaveApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | LeaveStatus>("Pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/leaves/all");
      setApplications(extractArray(res.data));
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch leave applications");
    } finally {
      setLoading(false);
    }
  };

  const reviewLeave = async (id: string, status: Exclude<LeaveStatus, "Pending">) => {
    try {
      setReviewingId(id);
      setError("");
      const res = await api.patch(`/leaves/${id}/review`, {
        status,
        adminRemarks: remarks[id]?.trim() || "",
      });

      setApplications((current) =>
        current.map((application) =>
          application._id === id ? res.data : application
        )
      );
      setRemarks((current) => ({ ...current, [id]: "" }));
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update leave status");
    } finally {
      setReviewingId(null);
    }
  };

  const filteredApplications = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return applications.filter((application) => {
      const matchesStatus = filter === "all" || application.status === filter;
      const searchable = [
        application.subject,
        application.reason,
        application.type,
        application.user?.name,
        application.user?.email,
        application.user?.studentId,
        application.user?.course,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesStatus && (!query || searchable.includes(query));
    });
  }, [applications, filter, searchTerm]);

  const counts = {
    all: applications.length,
    Pending: applications.filter((application) => application.status === "Pending").length,
    Approved: applications.filter((application) => application.status === "Approved").length,
    Rejected: applications.filter((application) => application.status === "Rejected").length,
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const getDaysCount = (start: string, end: string) => {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  };

  const getStatusBadge = (status: LeaveStatus) => {
    const styles = {
      Pending: "bg-amber-50 text-amber-700 border-amber-200",
      Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
      Rejected: "bg-rose-50 text-rose-700 border-rose-200",
    }[status];
    const Icon = status === "Approved" ? CheckCircle : status === "Rejected" ? XCircle : Clock;

    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${styles}`}>
        <Icon className="h-3.5 w-3.5" />
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Leave Applications
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Review student leave requests and record approval decisions.
            </p>
          </div>
          <button
            onClick={fetchApplications}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by student, ID, course, subject..."
              className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  filter === status
                    ? "bg-blue-600 text-white"
                    : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                }`}
              >
                {status === "all" ? "All" : status}
                <span className="ml-1 text-xs opacity-75">({counts[status]})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center dark:border-gray-700 dark:bg-gray-800">
          <div className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Loading leave applications...</p>
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white py-16 text-center dark:border-gray-700 dark:bg-gray-800">
          <MessageSquare className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="font-semibold text-gray-900 dark:text-white">No applications found</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Try another filter or search term.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((application) => (
            <div
              key={application._id}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      {application.subject}
                    </h3>
                    {getStatusBadge(application.status)}
                    <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                      {application.type}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-3 text-sm text-gray-600 dark:text-gray-300 md:grid-cols-2">
                    <div className="flex items-start gap-2">
                      <User className="mt-0.5 h-4 w-4 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {application.user?.name || "Unknown student"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {application.user?.studentId || application.user?.email || "No student ID"}
                          {application.user?.course ? ` • ${application.user.course}` : ""}
                          {application.user?.semester ? ` • Sem ${application.user.semester}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Calendar className="mt-0.5 h-4 w-4 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {formatDate(application.startDate)} to {formatDate(application.endDate)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {getDaysCount(application.startDate, application.endDate)} day
                          {getDaysCount(application.startDate, application.endDate) > 1 ? "s" : ""} requested
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 rounded-lg bg-gray-50 p-3 text-sm leading-6 text-gray-700 dark:bg-gray-900 dark:text-gray-300">
                    {application.reason}
                  </p>

                  {application.status !== "Pending" && (
                    <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-gray-900">
                      <p className="font-medium text-gray-900 dark:text-white">
                        Reviewed by {application.reviewedBy?.name || "Faculty"}
                      </p>
                      <p className="mt-1 text-gray-600 dark:text-gray-400">
                        {application.adminRemarks || "No remarks added."}
                      </p>
                      {application.reviewedAt && (
                        <p className="mt-1 text-xs text-gray-500">
                          {formatDate(application.reviewedAt)}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {application.status === "Pending" && (
                  <div className="w-full space-y-3 xl:w-80">
                    <textarea
                      value={remarks[application._id] || ""}
                      onChange={(event) =>
                        setRemarks((current) => ({
                          ...current,
                          [application._id]: event.target.value,
                        }))
                      }
                      rows={3}
                      placeholder="Add remarks for the student"
                      className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => reviewLeave(application._id, "Approved")}
                        disabled={reviewingId === application._id}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => reviewLeave(application._id, "Rejected")}
                        disabled={reviewingId === application._id}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-500 dark:border-gray-700">
                Submitted {formatDate(application.createdAt)} • Ref #{application._id.slice(-8).toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
