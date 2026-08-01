import AcademicCalendar from "../models/AcademicCalendar.model.js";

export const FINE_PER_DAY = parseInt(process.env.LIBRARY_FINE_PER_DAY, 10) || 10;

export const getMidnightDate = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Count overdue days that are chargeable: after due date, excluding weekends
 * and institutional Holiday calendar entries.
 */
export function calculateChargeableDays(dueDate, asOfDate = new Date(), holidayDates = []) {
  const start = getMidnightDate(dueDate);
  const end = getMidnightDate(asOfDate);
  if (end <= start) return 0;

  const toKey = (d) => {
    const x = getMidnightDate(d);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  };

  const holidaySet = new Set(holidayDates.map((d) => toKey(d)));

  let chargeable = 0;
  const cursor = new Date(start);
  cursor.setDate(cursor.getDate() + 1); // first day after due date

  while (cursor <= end) {
    const dow = cursor.getDay(); // 0 Sun … 6 Sat
    const key = toKey(cursor);
    const isWeekend = dow === 0 || dow === 6;
    const isHoliday = holidaySet.has(key);
    if (!isWeekend && !isHoliday) chargeable += 1;
    cursor.setDate(cursor.getDate() + 1);
  }

  return chargeable;
}

export async function loadHolidayDates(from, to) {
  try {
    const events = await AcademicCalendar.find({
      category: "Holiday",
      date: { $gte: getMidnightDate(from), $lte: getMidnightDate(to) },
    }).select("date");
    return events.map((e) => e.date);
  } catch {
    return [];
  }
}

export async function previewFineForIssue(issue, asOfDate = new Date()) {
  const due = getMidnightDate(issue.dueDate);
  const asOf = getMidnightDate(asOfDate);
  const holidays = await loadHolidayDates(due, asOf);
  const daysOverdue = calculateChargeableDays(due, asOf, holidays);
  return {
    daysOverdue,
    excludedWeekendsAndHolidays: true,
    amount: daysOverdue * FINE_PER_DAY,
    finePerDay: FINE_PER_DAY,
    holidayCount: holidays.length,
  };
}
