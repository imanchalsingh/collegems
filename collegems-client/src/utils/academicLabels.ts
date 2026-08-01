import { DEFAULT_ACADEMIC_LABELS } from "../constants/academicLabels";

export type AcademicLabelKey = keyof typeof DEFAULT_ACADEMIC_LABELS;

export const getAcademicLabel = (
  key: AcademicLabelKey,
  labels?: Partial<Record<AcademicLabelKey, string>>
): string => {
  return labels?.[key] ?? DEFAULT_ACADEMIC_LABELS[key] ?? key;
};