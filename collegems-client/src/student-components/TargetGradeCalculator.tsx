import { useMemo, useState } from "react";
import { Target } from "lucide-react";
import {
  type CreditCourse,
  gradeToMinPercentage,
  percentageToPoints,
  pointsToMinGrade,
  requiredPointsForTarget,
} from "../utils/cgpaSimulator";

export interface SimSubjectState {
  course: CreditCourse;
  percentage: number;
}

interface TargetGradeCalculatorProps {
  pastQualityPoints: number;
  pastCredits: number;
  subjects: SimSubjectState[];
  focusCourseId: string;
  onFocusChange: (courseId: string) => void;
}

export default function TargetGradeCalculator({
  pastQualityPoints,
  pastCredits,
  subjects,
  focusCourseId,
  onFocusChange,
}: TargetGradeCalculatorProps) {
  const [targetCgpa, setTargetCgpa] = useState(8.5);

  const focus = subjects.find((s) => s.course.id === focusCourseId) || subjects[0];

  const analysis = useMemo(() => {
    if (!focus) return null;

    const others = subjects.filter((s) => s.course.id !== focus.course.id);
    const otherSimQualityPoints = others.reduce(
      (sum, s) => sum + percentageToPoints(s.percentage) * s.course.credits,
      0
    );
    const otherSimCredits = others.reduce((sum, s) => sum + s.course.credits, 0);

    const result = requiredPointsForTarget({
      targetCgpa,
      pastQualityPoints,
      pastCredits,
      otherSimQualityPoints,
      otherSimCredits,
      focusCredits: focus.course.credits,
    });

    const minGrade = pointsToMinGrade(Math.max(0, Math.min(10, result.requiredPoints)));
    let advisedPct = minGrade ? gradeToMinPercentage(minGrade) : null;

    if (result.achievable && advisedPct != null) {
      while (advisedPct < 100 && percentageToPoints(advisedPct) < result.requiredPoints - 1e-9) {
        advisedPct += 1;
      }
    }

    return { ...result, minGrade, advisedPct };
  }, [focus, subjects, targetCgpa, pastQualityPoints, pastCredits]);

  if (!focus || subjects.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-600">
        Add semester subjects to calculate target grades.
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-teal-600" />
        <h3 className="font-semibold text-slate-900 dark:text-white">Target CGPA calculator</h3>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          Target CGPA
          <input
            type="number"
            min={0}
            max={10}
            step={0.1}
            value={targetCgpa}
            onChange={(e) => setTargetCgpa(Number(e.target.value) || 0)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
          />
        </label>
        <label className="block text-sm">
          Focus subject
          <select
            value={focus.course.id}
            onChange={(e) => onFocusChange(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
          >
            {subjects.map((s) => (
              <option key={s.course.id} value={s.course.id}>
                {s.course.code} — {s.course.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {analysis && (
        <div
          className={`rounded-lg px-3 py-3 text-sm ${
            analysis.achievable
              ? "bg-teal-50 text-teal-900 dark:bg-teal-950/40 dark:text-teal-100"
              : "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
          }`}
        >
          {analysis.achievable ? (
            <>
              <p className="font-semibold">
                Need ~{analysis.advisedPct}% ({analysis.minGrade}) in {focus.course.name} to achieve{" "}
                {targetCgpa.toFixed(1)} CGPA
              </p>
              <p className="mt-1 text-xs opacity-80">
                Required ≥ {analysis.requiredPoints.toFixed(2)} grade points on{" "}
                {focus.course.credits} credits · Reachable range with other sliders:{" "}
                {analysis.projectedMin.toFixed(2)}–{analysis.projectedMax.toFixed(2)}
              </p>
            </>
          ) : analysis.requiredPoints > 10 ? (
            <>
              <p className="font-semibold">
                {targetCgpa.toFixed(1)} CGPA is not reachable with current other-subject forecasts
              </p>
              <p className="mt-1 text-xs opacity-80">
                Even an A+ in {focus.course.code} caps projected CGPA at ~{analysis.projectedMax.toFixed(2)}.
                Raise other subject sliders or lower the target.
              </p>
            </>
          ) : (
            <p className="font-semibold">
              Target already met without needing points in {focus.course.code} (required{" "}
              {analysis.requiredPoints.toFixed(2)}).
            </p>
          )}
        </div>
      )}
    </div>
  );
}
