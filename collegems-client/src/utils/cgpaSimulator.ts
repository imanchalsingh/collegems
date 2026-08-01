/** Shared CGPA / grade-point helpers for the interactive simulator */

export type LetterGrade = "A+" | "A" | "B+" | "B" | "C+" | "C" | "D" | "F";

export const GRADE_POINTS: Record<LetterGrade, number> = {
  "A+": 10,
  A: 9,
  "B+": 8,
  B: 7,
  "C+": 6,
  C: 5,
  D: 4,
  F: 0,
};

export const GRADE_OPTIONS: LetterGrade[] = ["A+", "A", "B+", "B", "C+", "C", "D", "F"];

/** Percentage → letter grade (aligned with TeacherResults thresholds) */
export function percentageToGrade(pct: number): LetterGrade {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B+";
  if (pct >= 60) return "B";
  if (pct >= 50) return "C+";
  if (pct >= 40) return "C";
  if (pct >= 33) return "D";
  return "F";
}

/** Minimum percentage required to earn a letter grade */
export function gradeToMinPercentage(grade: LetterGrade): number {
  switch (grade) {
    case "A+":
      return 90;
    case "A":
      return 80;
    case "B+":
      return 70;
    case "B":
      return 60;
    case "C+":
      return 50;
    case "C":
      return 40;
    case "D":
      return 33;
    default:
      return 0;
  }
}

export function gradeToPoints(grade: string | undefined | null): number {
  if (!grade) return 0;
  const key = grade.trim().toUpperCase() as LetterGrade;
  if (key in GRADE_POINTS) return GRADE_POINTS[key as LetterGrade];
  return 0;
}

export function percentageToPoints(pct: number): number {
  return GRADE_POINTS[percentageToGrade(pct)];
}

/** Lowest letter grade whose points are >= requiredPoints */
export function pointsToMinGrade(requiredPoints: number): LetterGrade | null {
  if (requiredPoints > 10) return null;
  if (requiredPoints <= 0) return "F";
  const ordered: LetterGrade[] = ["F", "D", "C", "C+", "B", "B+", "A", "A+"];
  for (const g of ordered) {
    if (GRADE_POINTS[g] >= requiredPoints - 1e-9) return g;
  }
  return null;
}

export interface CreditCourse {
  id: string;
  name: string;
  code: string;
  credits: number;
}

export interface WeightedResult {
  credits: number;
  gradePoints: number;
}

export function computeGpa(items: WeightedResult[]): number | null {
  const credits = items.reduce((s, i) => s + i.credits, 0);
  if (credits <= 0) return null;
  const qp = items.reduce((s, i) => s + i.gradePoints * i.credits, 0);
  return Math.round((qp / credits) * 100) / 100;
}

export function qualityPoints(items: WeightedResult[]): number {
  return items.reduce((s, i) => s + i.gradePoints * i.credits, 0);
}

export function totalCredits(items: WeightedResult[]): number {
  return items.reduce((s, i) => s + i.credits, 0);
}

/**
 * Required grade points in `focusCredits` to hit target CGPA, given
 * already-earned QP/credits and other simulated courses' QP/credits.
 */
export function requiredPointsForTarget(params: {
  targetCgpa: number;
  pastQualityPoints: number;
  pastCredits: number;
  otherSimQualityPoints: number;
  otherSimCredits: number;
  focusCredits: number;
}): { requiredPoints: number; achievable: boolean; projectedMax: number; projectedMin: number } {
  const {
    targetCgpa,
    pastQualityPoints,
    pastCredits,
    otherSimQualityPoints,
    otherSimCredits,
    focusCredits,
  } = params;

  const denom = pastCredits + otherSimCredits + focusCredits;
  if (denom <= 0 || focusCredits <= 0) {
    return { requiredPoints: 0, achievable: false, projectedMax: 0, projectedMin: 0 };
  }

  const requiredPoints =
    (targetCgpa * denom - pastQualityPoints - otherSimQualityPoints) / focusCredits;

  const projectedMax =
    (pastQualityPoints + otherSimQualityPoints + 10 * focusCredits) / denom;
  const projectedMin =
    (pastQualityPoints + otherSimQualityPoints + 0 * focusCredits) / denom;

  return {
    requiredPoints,
    achievable: requiredPoints <= 10 + 1e-9 && requiredPoints >= 0,
    projectedMax: Math.round(projectedMax * 100) / 100,
    projectedMin: Math.round(projectedMin * 100) / 100,
  };
}
