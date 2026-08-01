import cron from "node-cron";
import PTMBooking from "../models/PTMBooking.model.js";
import Notification from "../models/Notification.model.js";
import { sendEmail } from "../utils/email.js";

/**
 * Sends reminder emails/notifications ~15 minutes before approved PTMs.
 */
export const processPTMReminders = async (now = new Date()) => {
  const windowStart = new Date(now.getTime() + 14 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 16 * 60 * 1000);

  const upcoming = await PTMBooking.find({
    status: "approved",
    reminderSentAt: { $exists: false },
    scheduledAt: { $gte: windowStart, $lte: windowEnd },
  })
    .populate("parent", "name email")
    .populate("teacher", "name email")
    .populate("student", "name studentId");

  const results = [];

  for (const booking of upcoming) {
    const when = booking.scheduledAt.toLocaleString();
    const joinUrl = booking.meetingUrl;
    const subject = "PTM Reminder — meeting starts in 15 minutes";
    const bodyFor = (name) =>
      `Hello ${name},\n\nYour Parent-Teacher video meeting starts in about 15 minutes (${when}).\nChild: ${booking.student?.name || "Student"}\nJoin: ${joinUrl}\n\n— SCMS`;

    try {
      if (booking.parent?.email) {
        await sendEmail(booking.parent.email, subject, bodyFor(booking.parent.name)).catch(
          () => false
        );
      }
      if (booking.teacher?.email) {
        await sendEmail(booking.teacher.email, subject, bodyFor(booking.teacher.name)).catch(
          () => false
        );
      }

      await Notification.create({
        recipient: booking.parent._id,
        type: "system",
        message: `PTM with ${booking.teacher?.name} starts in 15 minutes`,
      }).catch(() => null);

      await Notification.create({
        recipient: booking.teacher._id,
        type: "system",
        message: `PTM with ${booking.parent?.name} starts in 15 minutes`,
      }).catch(() => null);

      booking.reminderSentAt = now;
      await booking.save();
      results.push({ id: booking._id, reminded: true });
    } catch (error) {
      results.push({ id: booking._id, error: error.message });
    }
  }

  return { checkedAt: now.toISOString(), processed: results.length, results };
};

export const startPTMReminderCron = () => {
  // Every minute — catches the 15-minute reminder window
  cron.schedule("* * * * *", async () => {
    try {
      const summary = await processPTMReminders();
      if (summary.processed > 0) {
        console.log(`[PTM Reminder] Sent ${summary.processed} reminder(s)`);
      }
    } catch (error) {
      console.error("[PTM Reminder] Error:", error.message);
    }
  });
  console.log("[PTM Reminder] Cron scheduled (every minute)");
};
