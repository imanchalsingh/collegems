import cron from "node-cron";
import Fee from "../models/Fee.model.js";
import User from "../models/User.model.js";
import BookIssue from "../models/BookIssue.model.js";
import LibraryFine from "../models/LibraryFine.model.js";
import Notification from "../models/Notification.model.js";
import { sendFeeReminderEmail, sendOverdueEmail } from "./email.js";
import { batchGenerateAnalytics } from "../services/analytics.service.js";
import { analyzeAttendanceAnomalies } from "../services/attendanceAnomaly.service.js";

/**
 * Normalizes a date to midnight for accurate day-difference calculations.
 */
const getMidnightDate = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Background job to process fee statuses and send reminders.
 * Runs every day at 00:01 (1 minute past midnight).
 */
export const startFeeCronJobs = () => {
  console.log("🕒 Initializing Fee Cron Jobs...");

  cron.schedule("1 0 * * *", async () => {
    console.log("🔄 Running daily fee check cron job...");
    try {
      const today = getMidnightDate(new Date());

      // 1. Process Overdue Fees
      // Find all pending or partial fees where the due date has passed
      const overdueFees = await Fee.find({
        status: { $in: ["Pending", "Partial"] },
        dueDate: { $lt: today },
      }).populate("student");

      for (const fee of overdueFees) {
        // Trigger pre-save hook to update status to "Overdue"
        await fee.save();

        if (fee.student?.settings?.notifications?.email) {
          await sendOverdueEmail(fee.student, fee);
        }
      }

      console.log(`✅ Processed ${overdueFees.length} newly overdue fees.`);

      // 2. Process Upcoming Reminders (7, 3, and 1 days before due date)
      const upcomingFees = await Fee.find({
        status: { $in: ["Pending", "Partial"] },
        dueDate: { $gte: today },
      }).populate("student");

      let reminderCount = 0;

      for (const fee of upcomingFees) {
        const feeDate = getMidnightDate(fee.dueDate);
        const timeDiff = feeDate.getTime() - today.getTime();
        const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));

        // Send reminders if exactly 7, 3, or 1 days left
        if (daysLeft === 7 || daysLeft === 3 || daysLeft === 1) {
          if (fee.student?.settings?.notifications?.email) {
            await sendFeeReminderEmail(fee.student, fee, daysLeft);
            reminderCount++;
          }
        }
      }

      console.log(`✅ Sent ${reminderCount} fee reminder emails.`);
    } catch (error) {
      console.error("❌ Error in fee cron job:", error);
    }
  });
};

export const startAnalyticsCronJobs = () => {
  console.log("🕒 Initializing Analytics Cron Jobs...");
  
  // Run every Sunday at 2:00 AM
  cron.schedule("0 2 * * 0", async () => {
    console.log("🔄 Running weekly analytics generation job...");
    await batchGenerateAnalytics();
  });
};

export const processLibraryFines = async () => {
  console.log("🔄 Running daily library fine check...");
  try {
    const today = getMidnightDate(new Date());

    // 1. Mark newly overdue books and create initial fine record
    const newlyOverdue = await BookIssue.find({
      status: "issued",
      dueDate: { $lt: today },
    }).populate("user");

    for (const issue of newlyOverdue) {
      issue.status = "overdue";
      await issue.save();

      const existingFine = await LibraryFine.findOne({ issue: issue._id });
      if (!existingFine) {
        const fine = new LibraryFine({
          student: issue.user._id,
          issue: issue._id,
          amount: 10, // Base fine of 10 rupees for the first day
          daysOverdue: 1,
          status: "Unpaid"
        });
        await fine.save();

        // Notify student
        const notification = new Notification({
          recipient: issue.user._id,
          type: "library",
          message: `Your library book "${issue.book}" is overdue. A fine of ₹10 has been generated.`,
        });
        await notification.save();
      }
    }

    console.log(`✅ Processed ${newlyOverdue.length} newly overdue books.`);

    // 2. Update fines for existing overdue books
    const overdueBooks = await BookIssue.find({
      status: "overdue",
    });

    let updatedCount = 0;
    for (const issue of overdueBooks) {
      const issueDate = getMidnightDate(issue.dueDate);
      const timeDiff = today.getTime() - issueDate.getTime();
      const daysOverdue = Math.ceil(timeDiff / (1000 * 3600 * 24));

      if (daysOverdue > 0) {
        const fine = await LibraryFine.findOne({ issue: issue._id });
        if (fine && fine.status === "Unpaid" && fine.daysOverdue !== daysOverdue) {
          fine.daysOverdue = daysOverdue;
          fine.amount = daysOverdue * 10; // ₹10 per day
          await fine.save();
          updatedCount++;
        }
      }
    }
    
    console.log(`✅ Updated fines for ${updatedCount} existing overdue books.`);
  } catch (error) {
    console.error("❌ Error in library fine processor:", error);
  }
};

export const startLibraryCronJobs = () => {
  console.log("🕒 Initializing Library Cron Jobs...");

  // Run every day at 00:05 (5 minutes past midnight)
  cron.schedule("5 0 * * *", processLibraryFines);
};

export const startAttendanceCronJobs = () => {
  console.log("🕒 Initializing Attendance Cron Jobs...");
  
  // Run every day at 01:00 AM
  cron.schedule("0 1 * * *", async () => {
    await analyzeAttendanceAnomalies();
  });
};
