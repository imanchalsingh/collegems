import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  FileUp,
  Sparkles,
  Download,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Filter,
} from "lucide-react";
import api from "../api/axios";

interface Drive {
  _id: string;
  companyName: string;
  role: string;
  description?: string;
  eligibility?: {
    minCGPA?: number;
    maxBacklogs?: number;
    allowedBranches?: string[];
  };
  status?: string;
}

interface ParsedResume {
  skills: string[];
  education: Array<{ degree?: string; institution?: string; year?: number | null }>;
  experience: Array<{ title?: string; org?: string }>;
  projects: string[];
  raw_text_preview?: string;
}

interface AtsScore {
  ats_score: number;
  match_level: string;
  matched_skills: string[];
  missing_skills: string[];
  cosine_similarity: number;
  eligible?: boolean;
  eligibility_reasons?: string[];
  fallback?: boolean;
}

interface ShortlistRow {
  student: {
    _id: string;
    name: string;
    email: string;
    course?: string;
    cgpa?: number;
    backlogs?: number;
  };
  ats_score: number;
  match_level: string;
  matched_skills: string[];
  missing_skills: string[];
  eligible: boolean;
  reasons: string[];
}

export default function PlacementMatchmaker() {
  const [drives, setDrives] = useState<Drive[]>([]);
  const [selectedDriveId, setSelectedDriveId] = useState("");
  const [minAts, setMinAts] = useState(60);
  const [parsed, setParsed] = useState<ParsedResume | null>(null);
  const [score, setScore] = useState<AtsScore | null>(null);
  const [shortlist, setShortlist] = useState<ShortlistRow[]>([]);
  const [csv, setCsv] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedDrive = useMemo(
    () => drives.find((d) => d._id === selectedDriveId) || null,
    [drives, selectedDriveId]
  );

  const loadDrives = useCallback(async () => {
    try {
      const res = await api.get<Drive[] | { data: Drive[] }>("/placements");
      const list = Array.isArray(res.data) ? res.data : res.data.data || [];
      setDrives(list);
      if (list[0] && !selectedDriveId) setSelectedDriveId(list[0]._id);
    } catch {
      setError("Could not load placement drives");
    }
  }, [selectedDriveId]);

  useEffect(() => {
    loadDrives();
  }, [loadDrives]);

  const handleParseFile = async (file: File) => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.post<{ data: ParsedResume }>("/placements/ats/parse", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setParsed(res.data.data);
      setMessage(
        `Parsed ${res.data.data.skills?.length || 0} skills from resume`
      );
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Resume parse failed — is ML service running?");
    } finally {
      setLoading(false);
    }
  };

  const handleScore = async () => {
    if (!selectedDriveId) {
      setError("Select a placement drive first");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{ data: AtsScore }>("/placements/ats/score", {
        driveId: selectedDriveId,
        resume: parsed || undefined,
        requirements: selectedDrive?.role ? [selectedDrive.role] : [],
      });
      setScore(res.data.data);
      setMessage(`ATS score ${res.data.data.ats_score}% (${res.data.data.match_level})`);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "ATS scoring failed");
    } finally {
      setLoading(false);
    }
  };

  const handleShortlist = async () => {
    if (!selectedDriveId) {
      setError("Select a placement drive first");
      return;
    }
    setLoading(true);
    setError(null);
    setCsv(null);
    try {
      const res = await api.post<{
        data: {
          shortlisted: ShortlistRow[];
          export: { csv: string; count: number };
        };
      }>(`/placements/${selectedDriveId}/shortlist`, {
        min_ats_score: minAts,
        enforce_eligibility: true,
      });
      setShortlist(res.data.data.shortlisted || []);
      setCsv(res.data.data.export?.csv || null);
      setMessage(
        `Shortlisted ${res.data.data.export?.count ?? 0} candidates (min ATS ${minAts}%)`
      );
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Bulk shortlist failed");
    } finally {
      setLoading(false);
    }
  };

  const downloadCsv = () => {
    if (!csv) return;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ats-shortlist-${selectedDrive?.companyName || "drive"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-indigo-600" />
          AI Placement Matchmaker
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Parse PDF resumes, compute ATS compatibility scores, and export bulk shortlists for
          recruiters.
        </p>
      </div>

      {(message || error) && (
        <div
          className={`text-sm rounded-lg border px-3 py-2 flex gap-2 items-start ${
            error
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {error ? (
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          )}
          <span>{error || message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-indigo-600" />
            Placement drive
          </h3>
          <select
            value={selectedDriveId}
            onChange={(e) => setSelectedDriveId(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Select drive…</option>
            {drives.map((d) => (
              <option key={d._id} value={d._id}>
                {d.companyName} — {d.role}
              </option>
            ))}
          </select>
          {selectedDrive && (
            <div className="text-xs text-slate-600 space-y-1 bg-slate-50 rounded-lg p-3">
              <p>
                Min CGPA: {selectedDrive.eligibility?.minCGPA ?? "—"} · Max backlogs:{" "}
                {selectedDrive.eligibility?.maxBacklogs ?? "—"}
              </p>
              <p className="line-clamp-3">{selectedDrive.description || "No description"}</p>
            </div>
          )}
          <label className="block text-sm">
            Min ATS score for shortlist
            <input
              type="number"
              min={0}
              max={100}
              value={minAts}
              onChange={(e) => setMinAts(Number(e.target.value))}
              className="mt-1 w-full border rounded-lg px-3 py-2"
            />
          </label>
          <button
            type="button"
            onClick={handleShortlist}
            disabled={loading || !selectedDriveId}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />}
            Bulk shortlist candidates
          </button>
        </div>

        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-4 space-y-4">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <FileUp className="w-4 h-4 text-indigo-600" />
            Resume ATS preview
          </h3>
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleParseFile(f);
            }}
            className="block w-full text-sm text-slate-600"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleScore}
              disabled={loading || !selectedDriveId}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-white text-sm disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              Score vs selected drive
            </button>
            {csv && (
              <button
                type="button"
                onClick={downloadCsv}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-300 text-emerald-800 text-sm bg-emerald-50"
              >
                <Download className="w-4 h-4" />
                Export shortlist CSV
              </button>
            )}
          </div>

          {score && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg bg-indigo-50 p-3">
                <p className="text-[11px] text-indigo-700 uppercase">ATS score</p>
                <p className="text-2xl font-bold text-indigo-900">{score.ats_score}%</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-[11px] text-slate-500 uppercase">Match</p>
                <p className="text-lg font-semibold capitalize">{score.match_level}</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-3 col-span-2">
                <p className="text-[11px] text-emerald-700 uppercase">Matched skills</p>
                <p className="text-sm text-emerald-900">
                  {(score.matched_skills || []).join(", ") || "—"}
                </p>
              </div>
              <div className="rounded-lg bg-red-50 p-3 col-span-2 sm:col-span-4">
                <p className="text-[11px] text-red-700 uppercase">Missing skills</p>
                <p className="text-sm text-red-900">
                  {(score.missing_skills || []).join(", ") || "—"}
                </p>
              </div>
            </div>
          )}

          {parsed && (
            <div className="text-sm border border-slate-100 rounded-lg p-3 bg-slate-50 space-y-2">
              <p>
                <span className="font-medium">Skills:</span>{" "}
                {parsed.skills?.join(", ") || "—"}
              </p>
              <p>
                <span className="font-medium">Education:</span>{" "}
                {parsed.education?.map((e) => e.degree || e.institution).join("; ") || "—"}
              </p>
              <p>
                <span className="font-medium">Projects:</span>{" "}
                {parsed.projects?.slice(0, 3).join(" · ") || "—"}
              </p>
            </div>
          )}
        </div>
      </div>

      {shortlist.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">
              Shortlisted candidates ({shortlist.length})
            </h3>
            {csv && (
              <button
                type="button"
                onClick={downloadCsv}
                className="text-sm text-indigo-600 inline-flex items-center gap-1"
              >
                <Download className="w-4 h-4" /> CSV
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2">Student</th>
                  <th className="px-4 py-2">Course</th>
                  <th className="px-4 py-2">CGPA</th>
                  <th className="px-4 py-2">ATS</th>
                  <th className="px-4 py-2">Matched</th>
                  <th className="px-4 py-2">Missing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shortlist.map((row) => (
                  <tr key={row.student._id}>
                    <td className="px-4 py-2">
                      <div className="font-medium text-slate-800">{row.student.name}</div>
                      <div className="text-xs text-slate-500">{row.student.email}</div>
                    </td>
                    <td className="px-4 py-2">{row.student.course || "—"}</td>
                    <td className="px-4 py-2">{row.student.cgpa ?? "—"}</td>
                    <td className="px-4 py-2 font-semibold text-indigo-700">
                      {row.ats_score}%
                      <span className="ml-1 text-xs font-normal capitalize text-slate-500">
                        {row.match_level}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-emerald-800 max-w-[180px]">
                      {(row.matched_skills || []).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-2 text-xs text-red-700 max-w-[180px]">
                      {(row.missing_skills || []).join(", ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
