import { useEffect, useState } from "react";
import {
  Briefcase,
  Building2,
  Calendar,
  Loader2,
  MapPin,
  Plus,
  Send,
} from "lucide-react";
import api from "../../api/axios";
import { extractArray } from "../../utils/apiHelpers";

interface JobReferral {
  _id: string;
  title: string;
  company: string;
  type: string;
  description: string;
  location?: string;
  salary?: string;
  deadline: string;
  isReferral?: boolean;
  referralNote?: string;
  postedBy?: { name?: string; email?: string };
}

interface JobReferralBoardProps {
  canPost?: boolean;
  canApply?: boolean;
}

export default function JobReferralBoard({
  canPost = false,
  canApply = false,
}: JobReferralBoardProps) {
  const [jobs, setJobs] = useState<JobReferral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [applyingId, setApplyingId] = useState("");
  const [form, setForm] = useState({
    title: "",
    company: "",
    type: "Full-time",
    description: "",
    location: "",
    salary: "",
    deadline: "",
    referralNote: "",
  });

  const loadJobs = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/jobs?referral=true");
      setJobs(extractArray(res.data));
    } catch (err) {
      console.error(err);
      setError("Failed to load referral jobs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError("");
      setSuccess("");
      await api.post("/jobs", {
        ...form,
        isReferral: true,
        deadline: form.deadline || new Date(Date.now() + 14 * 86400000).toISOString(),
      });
      setSuccess("Referral job posted successfully.");
      setShowForm(false);
      setForm({
        title: "",
        company: "",
        type: "Full-time",
        description: "",
        location: "",
        salary: "",
        deadline: "",
        referralNote: "",
      });
      await loadJobs();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to post referral job.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApply = async (jobId: string) => {
    try {
      setApplyingId(jobId);
      setError("");
      setSuccess("");
      await api.post(`/jobs/${jobId}/apply`, {
        coverLetter: "Applied via Alumni Referral Board",
      });
      setSuccess("Application submitted.");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to apply. Upload a resume first if needed.";
      setError(message);
    } finally {
      setApplyingId("");
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Internal Referral Job Board
          </h2>
          <p className="text-sm text-slate-500">
            Openings shared by alumni for campus referrals
          </p>
        </div>
        {canPost && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 text-sm"
          >
            <Plus size={14} />
            Post Referral
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl px-3 py-2">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl px-3 py-2">
          {success}
        </p>
      )}

      {showForm && canPost && (
        <form
          onSubmit={handlePost}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 grid md:grid-cols-2 gap-3"
        >
          <input
            required
            placeholder="Job title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
          />
          <input
            required
            placeholder="Company"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
          />
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
          >
            <option value="Full-time">Full-time</option>
            <option value="Internship">Internship</option>
            <option value="Part-time">Part-time</option>
          </select>
          <input
            type="date"
            value={form.deadline}
            onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
          />
          <input
            placeholder="Location"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
          />
          <input
            placeholder="Salary (optional)"
            value={form.salary}
            onChange={(e) => setForm({ ...form, salary: e.target.value })}
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
          />
          <textarea
            required
            placeholder="Job description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="md:col-span-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm min-h-[90px]"
          />
          <textarea
            placeholder="Referral note for students"
            value={form.referralNote}
            onChange={(e) => setForm({ ...form, referralNote: e.target.value })}
            className="md:col-span-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm min-h-[70px]"
          />
          <button
            type="submit"
            disabled={submitting}
            className="md:col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white py-2.5 text-sm disabled:opacity-60"
          >
            {submitting ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
            Publish Referral Opening
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-indigo-600" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center text-slate-500">
          No referral openings yet.
        </div>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <article
              key={job._id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    {job.title}
                  </h3>
                  <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                    <Building2 size={14} />
                    {job.company}
                    <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-xs">
                      Referral
                    </span>
                  </p>
                </div>
                {canApply && (
                  <button
                    type="button"
                    onClick={() => handleApply(job._id)}
                    disabled={applyingId === job._id}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60"
                  >
                    {applyingId === job._id ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      <Briefcase size={14} />
                    )}
                    Apply
                  </button>
                )}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-3">
                {job.description}
              </p>
              {job.referralNote && (
                <p className="text-sm mt-2 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl px-3 py-2">
                  {job.referralNote}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <MapPin size={12} />
                  {job.location || "Remote / Hybrid"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Calendar size={12} />
                  Deadline {new Date(job.deadline).toLocaleDateString()}
                </span>
                <span>{job.type}</span>
                {job.postedBy?.name && <span>Posted by {job.postedBy.name}</span>}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
