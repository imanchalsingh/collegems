import BookIssue from "../models/BookIssue.model.js";
import LibraryFine from "../models/LibraryFine.model.js";
import Notification from "../models/Notification.model.js";
import {
  FINE_PER_DAY,
  getMidnightDate,
  loadHolidayDates,
  calculateChargeableDays,
  previewFineForIssue,
} from "../utils/libraryFineEngine.js";

/**
 * GET /api/library/fines/preview/:issueId
 */
export const previewFine = async (req, res) => {
  try {
    const issue = await BookIssue.findById(req.params.issueId).populate("book", "title isbn barcode");
    if (!issue) {
      return res.status(404).json({ success: false, message: "Issue not found" });
    }

    const preview = await previewFineForIssue(issue);
    res.json({ success: true, issue, preview });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/library/fines/recalculate
 * body: { issueId? } — omit to recalculate all unpaid overdue
 */
export const recalculateFines = async (req, res) => {
  try {
    const today = getMidnightDate(new Date());
    const filter = req.body?.issueId
      ? { _id: req.body.issueId, status: { $in: ["issued", "overdue"] } }
      : { status: { $in: ["issued", "overdue"] }, dueDate: { $lt: today } };

    const issues = await BookIssue.find(filter).populate("user", "name email");
    const minDue = issues.reduce(
      (min, i) => (i.dueDate < min ? i.dueDate : min),
      today
    );
    const holidays = await loadHolidayDates(minDue, today);

    let updated = 0;
    for (const issue of issues) {
      const daysOverdue = calculateChargeableDays(issue.dueDate, today, holidays);
      if (daysOverdue <= 0) continue;

      if (issue.status === "issued") {
        issue.status = "overdue";
        await issue.save();
      }

      let fine = await LibraryFine.findOne({ issue: issue._id });
      if (!fine) {
        fine = new LibraryFine({
          student: issue.user._id || issue.user,
          issue: issue._id,
          amount: daysOverdue * FINE_PER_DAY,
          daysOverdue,
          status: "Unpaid",
        });
        await fine.save();
        updated += 1;
      } else if (fine.status === "Unpaid") {
        if (fine.daysOverdue !== daysOverdue || fine.amount !== daysOverdue * FINE_PER_DAY) {
          fine.daysOverdue = daysOverdue;
          fine.amount = daysOverdue * FINE_PER_DAY;
          await fine.save();
          updated += 1;
        }
      }
    }

    res.json({
      success: true,
      message: `Recalculated fines (₹${FINE_PER_DAY}/chargeable day, weekends & holidays excluded)`,
      updated,
    });
  } catch (error) {
    console.error("recalculateFines:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Shared processor used by cron — holiday-aware.
 */
export const runAutomatedFineEngine = async () => {
  const today = getMidnightDate(new Date());
  const candidates = await BookIssue.find({
    status: { $in: ["issued", "overdue"] },
    dueDate: { $lt: today },
  }).populate("user").populate("book", "title");

  if (!candidates.length) {
    return { newlyFined: 0, updated: 0 };
  }

  const minDue = candidates.reduce(
    (min, i) => (i.dueDate < min ? i.dueDate : min),
    today
  );
  const holidays = await loadHolidayDates(minDue, today);

  let newlyFined = 0;
  let updated = 0;

  for (const issue of candidates) {
    const daysOverdue = calculateChargeableDays(issue.dueDate, today, holidays);
    if (daysOverdue <= 0) continue;

    if (issue.status === "issued") {
      issue.status = "overdue";
      await issue.save();
    }

    let fine = await LibraryFine.findOne({ issue: issue._id });
    if (!fine) {
      fine = new LibraryFine({
        student: issue.user._id,
        issue: issue._id,
        amount: daysOverdue * FINE_PER_DAY,
        daysOverdue,
        status: "Unpaid",
      });
      await fine.save();
      newlyFined += 1;

      const bookTitle = issue.book?.title || "library book";
      await Notification.create({
        recipient: issue.user._id,
        type: "library",
        message: `Your library book "${bookTitle}" is overdue. A fine of ₹${fine.amount} has been generated (${daysOverdue} chargeable day(s); weekends/holidays excluded).`,
      }).catch(() => null);
    } else if (fine.status === "Unpaid" && fine.daysOverdue !== daysOverdue) {
      fine.daysOverdue = daysOverdue;
      fine.amount = daysOverdue * FINE_PER_DAY;
      await fine.save();
      updated += 1;
    }
  }

  return { newlyFined, updated };
};
