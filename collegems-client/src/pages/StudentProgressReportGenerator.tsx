import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  AlertTriangle,
  GraduationCap,
} from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import api from "../api/axios";
import PerformanceRadarChart from "../components/reports/PerformanceRadarChart";

interface StudentOption {
  _id: string;
  name: string;
  email: string;
  studentId?: string;
  semester?: string;
  course?: string;
}

interface ProgressReportData {
  generatedAt: string;
  college: { name: string; sealLabel: string };
  student: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    studentId?: string;
    semester?: string;
    course?: string;
  };
  summary: {
    semesterGpa: number | null;
    attendancePercentage: number;
    assignmentCompletionRate: number;
    overallScore: number;
  };
  metrics: {
    academics: number;
    attendance: number;
    assignments: number;
    extraCurriculars: number;
    softSkills: number;
  };
  radarData: {
    metric: string;
    student: number;
    classAverage: number;
  }[];
  details: {
    attendancePresent: number;
    attendanceTotal: number;
    assignmentsSubmitted: number;
    assignmentsTracked: number;
    eventCheckIns: number;
    hasMentor: boolean;
    results: {
      course: string;
      code: string;
      grade: string;
      totalMarks: number;
    }[];
  };
  aiInsights: {
    riskLevel: string;
    dropoutRiskScore: number;
    predictedPerformance: string;
    remarks: string[];
  };
}

const riskBadgeClass = (level: string) => {
  switch (level) {
    case "high":
      return "bg-red-100 text-red-800 border-red-200";
    case "medium":
      return "bg-amber-100 text-amber-800 border-amber-200";
    default:
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
  }
};

export default function StudentProgressReportGenerator() {
  const navigate = useNavigate();
  const reportRef = useRef<HTMLDivElement>(null);

  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [report, setReport] = useState<ProgressReportData | null>(null);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadStudents = async () => {
      try {
        setLoadingStudents(true);
        const res = await api.get("/progress-reports/students");
        setStudents(res.data.data || []);
      } catch (err) {
        console.error(err);
        setError("Failed to load student list.");
      } finally {
        setLoadingStudents(false);
      }
    };
    loadStudents();
  }, []);

  const handleGenerate = async () => {
    if (!selectedStudentId) {
      setError("Please select a student first.");
      return;
    }
    try {
      setLoadingReport(true);
      setError("");
      const res = await api.get(`/progress-reports/${selectedStudentId}`);
      if (res.data.success) {
        setReport(res.data.data);
      } else {
        setError(res.data.message || "Failed to generate report.");
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to generate progress report.";
      setError(message);
    } finally {
      setLoadingReport(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!reportRef.current || !report) return;
    try {
      setExporting(true);
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const safeName = report.student.name.replace(/\s+/g, "_");
      pdf.save(`Progress_Report_${safeName}.pdf`);
    } catch (err) {
      console.error(err);
      setError("PDF export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const role = localStorage.getItem("role");
  const backPath =
    role === "hod" ? "/hod/dashboard" : "/teacher/dashboard";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate(backPath)}
            className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-teal-700"
          >
            <ArrowLeft size={16} />
            Back to dashboard
          </button>
          <div className="inline-flex items-center gap-2 text-teal-800 dark:text-teal-300">
            <FileText size={18} />
            <span className="font-medium">Student Progress Report Card</span>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <h1 className="text-xl font-semibold mb-1">
            Automated Progress Report Generator
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Aggregate GPA, attendance, assignments, extracurriculars, and AI
            remarks into a printable report card with radar analytics.
          </p>

          <div className="flex flex-col md:flex-row gap-3 md:items-end">
            <label className="flex-1 text-sm">
              <span className="block mb-1 text-slate-600 dark:text-slate-300">
                Select student
              </span>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                disabled={loadingStudents}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2"
              >
                <option value="">
                  {loadingStudents ? "Loading students..." : "Choose a student"}
                </option>
                {students.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                    {s.studentId ? ` (${s.studentId})` : ""}
                    {s.semester ? ` — Sem ${s.semester}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={loadingReport || !selectedStudentId}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white px-4 py-2.5"
            >
              {loadingReport ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <RefreshCw size={16} />
              )}
              Generate Report
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={!report || exporting}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-60 px-4 py-2.5"
            >
              {exporting ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Download size={16} />
              )}
              Download PDF
            </button>
          </div>

          {error && (
            <p className="mt-3 text-sm text-red-600 flex items-center gap-2">
              <AlertTriangle size={14} />
              {error}
            </p>
          )}
        </section>

        {report && (
          <div
            ref={reportRef}
            className="rounded-2xl border border-slate-200 bg-white text-slate-900 p-6 md:p-8 space-y-6 shadow-sm"
          >
            <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div className="flex items-start gap-3">
                <div className="h-14 w-14 rounded-full border-2 border-teal-700 flex items-center justify-center text-[10px] font-bold text-teal-800 tracking-wide">
                  {report.college.sealLabel}
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-semibold text-teal-900">
                    {report.college.name}
                  </h2>
                  <p className="text-sm text-slate-500">
                    Official Student Progress Report Card
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Generated{" "}
                    {new Date(report.generatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <div
                className={`px-3 py-1 rounded-full border text-xs font-medium uppercase ${riskBadgeClass(
                  report.aiInsights.riskLevel
                )}`}
              >
                AI Risk: {report.aiInsights.riskLevel}
              </div>
            </header>

            <section className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1 text-sm">
                <p className="inline-flex items-center gap-2 font-medium text-base">
                  <GraduationCap size={16} className="text-teal-700" />
                  {report.student.name}
                </p>
                <p>ID: {report.student.studentId || "N/A"}</p>
                <p>Email: {report.student.email}</p>
                <p>Course: {report.student.course || "N/A"}</p>
                <p>Semester: {report.student.semester || "N/A"}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <MetricTile
                  label="Semester GPA"
                  value={
                    report.summary.semesterGpa !== null
                      ? String(report.summary.semesterGpa)
                      : "N/A"
                  }
                />
                <MetricTile
                  label="Overall Score"
                  value={`${report.summary.overallScore}%`}
                />
                <MetricTile
                  label="Attendance"
                  value={`${report.summary.attendancePercentage}%`}
                />
                <MetricTile
                  label="Assignments"
                  value={`${report.summary.assignmentCompletionRate}%`}
                />
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold mb-2 text-slate-700">
                Skill Distribution vs Class Average
              </h3>
              <PerformanceRadarChart data={report.radarData} />
            </section>

            <section className="grid md:grid-cols-5 gap-2 text-center text-sm">
              {(
                [
                  ["Academics", report.metrics.academics],
                  ["Attendance", report.metrics.attendance],
                  ["Assignments", report.metrics.assignments],
                  ["Extra-curriculars", report.metrics.extraCurriculars],
                  ["Soft Skills", report.metrics.softSkills],
                ] as const
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-3"
                >
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="text-lg font-semibold text-teal-800">
                    {value}%
                  </p>
                </div>
              ))}
            </section>

            {report.details.results.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold mb-2 text-slate-700">
                  Course Results
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-left">
                        <th className="p-2 border border-slate-200">Course</th>
                        <th className="p-2 border border-slate-200">Code</th>
                        <th className="p-2 border border-slate-200">Grade</th>
                        <th className="p-2 border border-slate-200">Marks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.details.results.map((row, idx) => (
                        <tr key={`${row.code}-${idx}`}>
                          <td className="p-2 border border-slate-200">
                            {row.course}
                          </td>
                          <td className="p-2 border border-slate-200">
                            {row.code}
                          </td>
                          <td className="p-2 border border-slate-200">
                            {row.grade}
                          </td>
                          <td className="p-2 border border-slate-200">
                            {row.totalMarks}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h3 className="text-sm font-semibold text-amber-900 mb-2">
                AI Performance Remarks
              </h3>
              <p className="text-xs text-amber-800 mb-2">
                Predicted grade: {report.aiInsights.predictedPerformance} ·
                Risk score:{" "}
                {Math.round(report.aiInsights.dropoutRiskScore * 100)}%
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm text-amber-950">
                {report.aiInsights.remarks.map((remark) => (
                  <li key={remark}>{remark}</li>
                ))}
              </ul>
            </section>

            <footer className="pt-2 border-t border-slate-200 text-xs text-slate-400 flex flex-wrap justify-between gap-2">
              <span>
                Attendance {report.details.attendancePresent}/
                {report.details.attendanceTotal} · Assignments{" "}
                {report.details.assignmentsSubmitted}/
                {report.details.assignmentsTracked} · Events{" "}
                {report.details.eventCheckIns}
                {report.details.hasMentor ? " · Mentorship active" : ""}
              </span>
              <span>SCMS · Confidential academic record</span>
            </footer>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-base font-semibold text-slate-800">{value}</p>
    </div>
  );
}
