import cron from "node-cron";
import nodemailer from "nodemailer";
import Reminder from "../models/Reminder.model.js";

// Initialize transporter IF credentials exist
const transporter = process.env.EMAIL_USER && process.env.EMAIL_PASS 
  ? nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })
  : null;

export const startReminderCron = () => {
  // Runs every day at 10:00 AM
  cron.schedule("* * * * *", async () => {
    try {
      const pendingReminders = await Reminder.find({ status: "queued" }).populate("user", "name email");

      if (pendingReminders.length === 0) return;

      for (const reminder of pendingReminders) {
        if (!reminder.user || !reminder.user.email) {
          reminder.status = "failed";
          await reminder.save();
          continue;
        }

        const subject = "Action Required: Complete Your Profile";
        const text = `Hello ${reminder.user.name},\n\nPlease log in to the portal to complete your missing profile information.\n\nThank you!`;

        if (transporter) {
          // REAL EMAIL LOGIC
          try {
            await transporter.sendMail({ from: process.env.EMAIL_USER, to: reminder.user.email, subject, text });
            reminder.status = "sent";
          } catch (err) {
            console.error(`Email failed for ${reminder.user.email}`, err);
            reminder.status = "failed";
          }
        } else {
          // MOCK EMAIL LOGIC (Fallback for local testing)
          console.log(`[MOCK EMAIL] To: ${reminder.user.email} | Subject: ${subject}`);
          reminder.status = "sent"; 
        }

        await reminder.save();
      }
    } catch (error) {
      console.error("Error processing reminder queue:", error);
    }
  });
};