import { useEffect, useMemo, useState } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { jsPDF } from "jspdf";
import {
  Calculator,
  FileDown,
  Loader2,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import api from "../api/axios";
import { extractArray } from "../utils/apiHelpers";
import {
  type CreditCourse,
  computeGpa,
  gradeToPoints,
  percentageToGrade,
  percentageToPoints,
  qualityPoints,
  totalCredits,
} from "../utils/cgpaSimulator";
import TargetGradeCalculator, { type SimSubjectState } from "./TargetGradeCalculator";

interface PublishedResult {
  grade?: string;
  totalMarks?: number;
  semester?: string;
  courseId?: { _id?: string; name?: string; code?: string; credits?: number };
}

interface FacultyAssignmentRow {
  _id: string;
  course?: { _id: string; name: string; code: string; credits?: number };
}

const PIE_COLORS = ["#0f766e", "#0369a1", "#b45309", "#7c3aed", "#be123c", "#15803d", "#c2410c", "#4338ca"];

export default function CGPASimulator() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pastItems, setPastItems] = useState<{ credits: number; gradePoints: number }[]>([]);
  const [subjects, setSubjects] = useState<SimSubjectState[]>([]);
  const [focusCourseId, setFocusCourseId] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setError("");

      const [resultsRes, facultyRes] = await Promise.all([
        api.get("/results/my").catch(() => ({ data: [] })),
        api.get("/faculty-assignments/for-student").catch(() => ({ data: [] })),
      ]);

      const results = extractArray<PublishedResult>(resultsRes.data);
      const pastFixed = results.map((r) => ({
        credits: r.courseId?.credits || 3,
        gradePoints: gradeToPoints(r.grade) || percentageToPoints(Number(r.totalMarks) || 0),
      }));
      setPastItems(pastFixed);

      const assignments = extractArray<FacultyAssignmentRow>(facultyRes.data);
      const courseMap = new Map<string, CreditCourse>();
      for (const row of assignments) {
        if (!row.course?._id) continue;
        courseMap.set(row.course._id, {
          id: row.course._id,
          name: row.course.name,
          code: row.course.code,
          credits: row.course.credits || 3,
        });
      }

      // If no faculty assignments, seed from unique result courses as editable what-if set
      if (courseMap.size === 0) {
        for (const r of results) {
          const id = r.courseId?._id || r.courseId?.code || r.courseId?.name;
          if (!id || !r.courseId) continue;
          courseMap.set(String(id), {
            id: String(id),
            name: r.courseId.name || "Course",
            code: r.courseId.code || "N/A",
            credits: r.courseId.credits || 3,
          });
        }
      }

      const simSubjects: SimSubjectState[] = [...courseMap.values()].map((course) => ({
        course,
        percentage: 75,
      }));

      // Demo subjects if student has no data yet
      if (simSubjects.length === 0) {
        simSubjects.push(
          { course: { id: "demo-math", name: "Mathematics", code: "MATH101", credits: 4 }, percentage: 75 },
          { course: { id: "demo-phy", name: "Physics", code: "PHY101", credits: 3 }, percentage: 70 },
          { course: { id: "demo-cs", name: "Programming", code: "CS101", credits: 4 }, percentage: 80 },
          { course: { id: "demo-eng", name: "English", code: "ENG101", credits: 2 }, percentage: 85 }
        );
      }

      setSubjects(simSubjects);
      setFocusCourseId(simSubjects[0]?.course.id || "");
    } catch (err) {
      console.error(err);
      setError("Failed to load courses or results for simulation.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const pastCredits = totalCredits(pastItems);
  const pastQp = qualityPoints(pastItems);
  const currentCgpa = computeGpa(pastItems);

  const simItems = useMemo(
    () =>
      subjects.map((s) => ({
        credits: s.course.credits,
        gradePoints: percentageToPoints(s.percentage),
        name: s.course.name,
        code: s.course.code,
        percentage: s.percentage,
        grade: percentageToGrade(s.percentage),
      })),
    [subjects]
  );

  const simSgpa = computeGpa(simItems);
  const projectedCgpa = computeGpa([
    ...pastItems,
    ...simItems.map((s) => ({ credits: s.credits, gradePoints: s.gradePoints })),
  ]);

  const pieData = subjects.map((s) => ({
    name: s.course.code,
    value: s.course.credits,
    fullName: s.course.name,
  }));

  const setPercentage = (id: string, percentage: number) => {
    setSubjects((prev) =>
      prev.map((s) => (s.course.id === id ? { ...s, percentage } : s))
    );
  };

  const exportPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Simulated Academic Plan", 14, 18);
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 26);
    doc.text(`Current CGPA (published): ${currentCgpa?.toFixed(2) ?? "N/A"}`, 14, 34);
    doc.text(`Simulated semester SGPA: ${simSgpa?.toFixed(2) ?? "N/A"}`, 14, 42);
    doc.text(`Projected overall CGPA: ${projectedCgpa?.toFixed(2) ?? "N/A"}`, 14, 50);

    let y = 62;
    doc.setFont("helvetica", "bold");
    doc.text("Course", 14, y);
    doc.text("Credits", 90, y);
    doc.text("Forecast %", 120, y);
    doc.text("Grade", 160, y);
    doc.setFont("helvetica", "normal");
    y += 8;

    for (const s of simItems) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(String(s.code).slice(0, 24), 14, y);
      doc.text(String(s.credits), 90, y);
      doc.text(`${s.percentage}%`, 120, y);
      doc.text(s.grade, 160, y);
      y += 7;
    }

    y += 6;
    doc.setFontSize(9);
    doc.text("This plan is a what-if simulation and does not replace official transcripts.", 14, y);
    doc.save("cgpa-simulation-plan.pdf");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading CGPA simulator…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-white">
            <Calculator className="h-5 w-5 text-teal-600" />
            CGPA &amp; Grade Point Simulator
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Forecast how upcoming semester grades affect your CGPA using course credit weights.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button
            type="button"
            onClick={exportPdf}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-3 py-2 text-sm font-medium text-white"
          >
            <FileDown className="h-4 w-4" /> Export PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Current CGPA" value={currentCgpa?.toFixed(2) ?? "—"} hint={`${pastCredits} published credits`} />
        <StatCard label="Simulated SGPA" value={simSgpa?.toFixed(2) ?? "—"} hint="This semester forecast" />
        <StatCard label="Projected CGPA" value={projectedCgpa?.toFixed(2) ?? "—"} hint="Past + simulation" highlight />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
            <SlidersHorizontal className="h-4 w-4 text-slate-500" />
            Hypothetical grades
          </h3>
          {subjects.map((s) => {
            const grade = percentageToGrade(s.percentage);
            return (
              <div key={s.course.id} className="space-y-1.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium text-slate-800 dark:text-slate-100">
                    {s.course.code}{" "}
                    <span className="font-normal text-slate-500">{s.course.name}</span>
                  </span>
                  <span className="tabular-nums text-slate-600 dark:text-slate-300">
                    {s.course.credits} cr · {s.percentage}% · {grade} (
                    {percentageToPoints(s.percentage)} GP)
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={s.percentage}
                  onChange={(e) => setPercentage(s.course.id, Number(e.target.value))}
                  className="w-full accent-teal-700"
                />
              </div>
            );
          })}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">
              Credit weightage
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, value }) => `${name} (${value})`}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, _n, item) => [
                      `${value} credits`,
                      (item?.payload as { fullName?: string })?.fullName || "",
                    ]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <TargetGradeCalculator
            pastQualityPoints={pastQp}
            pastCredits={pastCredits}
            subjects={subjects}
            focusCourseId={focusCourseId || subjects[0]?.course.id || ""}
            onFocusChange={setFocusCourseId}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: string;
  hint: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight
          ? "border-teal-300 bg-teal-50 dark:border-teal-800 dark:bg-teal-950/30"
          : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
      }`}
    >
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{hint}</p>
    </div>
  );
}
