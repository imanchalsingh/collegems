import { Briefcase, GraduationCap, Linkedin, MapPin, UserRound } from "lucide-react";

export interface AlumniCardData {
  _id: string;
  name: string;
  email: string;
  batch: string;
  department: string;
  currentCompany?: string;
  designation?: string;
  industry?: string;
  location?: string;
  linkedInUrl?: string;
  skills?: string[];
  openToMentorship?: boolean;
  isVerified?: boolean;
  userId?: string;
}

interface AlumniDirectoryCardProps {
  alumni: AlumniCardData;
  requesting?: boolean;
  canRequestMentorship?: boolean;
  onRequestMentorship?: (alumniId: string) => void;
}

export default function AlumniDirectoryCard({
  alumni,
  requesting = false,
  canRequestMentorship = false,
  onRequestMentorship,
}: AlumniDirectoryCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-semibold text-lg">
            {alumni.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              {alumni.name}
              {alumni.isVerified && (
                <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                  Verified
                </span>
              )}
            </h3>
            <p className="text-sm text-slate-500">
              {alumni.department} · Batch {alumni.batch}
            </p>
          </div>
        </div>
        {alumni.linkedInUrl && (
          <a
            href={alumni.linkedInUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800"
            aria-label={`${alumni.name} LinkedIn`}
          >
            <Linkedin size={18} />
          </a>
        )}
      </div>

      <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
        <p className="flex items-center gap-2">
          <Briefcase size={14} className="text-slate-400" />
          <span>
            {alumni.designation || "Role N/A"} @{" "}
            <span className="font-medium text-slate-900 dark:text-white">
              {alumni.currentCompany || "Company N/A"}
            </span>
          </span>
        </p>
        <p className="flex items-center gap-2">
          <GraduationCap size={14} className="text-slate-400" />
          <span>{alumni.industry || "Industry N/A"}</span>
        </p>
        <p className="flex items-center gap-2">
          <MapPin size={14} className="text-slate-400" />
          <span>{alumni.location || alumni.email}</span>
        </p>
        {alumni.skills && alumni.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {alumni.skills.slice(0, 4).map((skill) => (
              <span
                key={skill}
                className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              >
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 flex gap-2">
        <a
          href={`mailto:${alumni.email}`}
          className="flex-1 text-center rounded-xl border border-slate-200 dark:border-slate-700 py-2 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          Connect
        </a>
        {canRequestMentorship && alumni.openToMentorship && (
          <button
            type="button"
            disabled={requesting || !alumni.userId}
            onClick={() => onRequestMentorship?.(alumni._id)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2 text-sm font-medium"
          >
            <UserRound size={14} />
            {requesting ? "Requesting..." : "Request Mentorship"}
          </button>
        )}
      </div>
    </article>
  );
}
