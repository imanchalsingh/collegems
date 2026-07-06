export const UserRole = {
  STUDENT: "student",
  TEACHER: "teacher",
  HOD: "hod",
  PARENT: "parent",
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];
