import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Create a reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail", // e.g., 'gmail'
  auth: {
    user: process.env.EMAIL_USER || "your-email@gmail.com",
    pass: process.env.EMAIL_PASS || "your-app-password",
  },
});

/**
 * Send an email using nodemailer
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} text - Plain text body
 * @param {string} html - HTML body (optional)
 */
export const sendEmail = async (to, subject, text, html = "") => {
  try {
    const info = await transporter.sendMail({
      from: `"College Management System" <${process.env.EMAIL_USER || "noreply@college.edu"}>`,
      to,
      subject,
      text,
      html: html || text,
    });
    console.log(`Email sent: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error.message);
    return false;
  }
};

/**
 * Send fee reminder email
 * @param {Object} user - User object containing name and email
 * @param {Object} fee - Fee object containing total, remaining, dueDate
 * @param {number} daysLeft - Number of days left until due date
 */
export const sendFeeReminderEmail = async (user, fee, daysLeft) => {
  const subject = `Fee Payment Reminder: ${daysLeft} days left`;
  const text = `Dear ${user.name},\n\nThis is a reminder that you have an upcoming fee payment due in ${daysLeft} days.\n\nDetails:\n- Total Fee: $${fee.total}\n- Remaining Amount: $${fee.total - fee.paid}\n- Due Date: ${new Date(fee.dueDate).toLocaleDateString()}\n\nPlease ensure your payment is made on or before the due date to avoid late penalties.\n\nRegards,\nCollege Administration`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #333;">Fee Payment Reminder</h2>
      <p>Dear <strong>${user.name}</strong>,</p>
      <p>This is a reminder that you have an upcoming fee payment due in <strong>${daysLeft} day(s)</strong>.</p>
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p><strong>Total Fee:</strong> $${fee.total}</p>
        <p><strong>Remaining Amount:</strong> <span style="color: #d9534f; font-weight: bold;">$${fee.total - fee.paid}</span></p>
        <p><strong>Due Date:</strong> ${new Date(fee.dueDate).toLocaleDateString()}</p>
      </div>
      <p>Please ensure your payment is made on or before the due date to avoid late penalties.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #777;">Regards,<br>College Administration</p>
    </div>
  `;

  return sendEmail(user.email, subject, text, html);
};

/**
 * Send fee overdue email
 * @param {Object} user - User object
 * @param {Object} fee - Fee object
 */
export const sendOverdueEmail = async (user, fee) => {
  const subject = `URGENT: Fee Payment Overdue`;
  const text = `Dear ${user.name},\n\nYour fee payment is now OVERDUE.\n\nDetails:\n- Remaining Amount: $${fee.total - fee.paid}\n- Original Due Date: ${new Date(fee.dueDate).toLocaleDateString()}\n\nPlease make the payment immediately to avoid restriction of services or penalties.\n\nRegards,\nCollege Administration`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #f5c6cb; border-radius: 10px; background-color: #f8d7da;">
      <h2 style="color: #721c24;">URGENT: Fee Payment Overdue</h2>
      <p>Dear <strong>${user.name}</strong>,</p>
      <p>Your fee payment is now <strong>OVERDUE</strong>.</p>
      <div style="background-color: #fff; padding: 15px; border-radius: 5px; margin: 15px 0; border: 1px solid #f5c6cb;">
        <p><strong>Remaining Amount:</strong> <span style="color: #721c24; font-weight: bold;">$${fee.total - fee.paid}</span></p>
        <p><strong>Original Due Date:</strong> ${new Date(fee.dueDate).toLocaleDateString()}</p>
      </div>
      <p>Please make the payment immediately to avoid restriction of services or penalties.</p>
      <hr style="border: none; border-top: 1px solid #f5c6cb; margin: 20px 0;" />
      <p style="font-size: 12px; color: #721c24;">Regards,<br>College Administration</p>
    </div>
  `;

  return sendEmail(user.email, subject, text, html);
};

/**
 * Send email verification link
 * @param {Object} user - User object containing name and email
 * @param {string} verificationUrl - URL for verification
 */
export const sendVerificationEmail = async (user, verificationUrl) => {
  const subject = `Verify Your Email Address`;
  const text = `Dear ${user.name},\n\nPlease verify your email address by clicking the following link:\n\n${verificationUrl}\n\nThis link will expire in 24 hours.\n\nIf you did not create an account, no further action is required.\n\nRegards,\nCollege Administration`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #333;">Verify Your Email Address</h2>
      <p>Dear <strong>${user.name}</strong>,</p>
      <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email</a>
      </div>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #007bff;">${verificationUrl}</p>
      <p>This link will expire in 24 hours.</p>
      <p>If you did not create an account, no further action is required.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #777;">Regards,<br>College Administration</p>
    </div>
  `;

  return sendEmail(user.email, subject, text, html);
};

/**
 * Send password reset email
 * @param {Object} user - User object containing name and email
 * @param {string} resetUrl - URL for password reset
 */
export const sendPasswordResetEmail = async (user, resetUrl) => {
  const subject = `Password Reset Request`;
  const text = `Dear ${user.name},\n\nYou requested a password reset. Please click the following link to set a new password:\n\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you did not request this, please ignore this email.\n\nRegards,\nCollege Administration`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #333;">Password Reset Request</h2>
      <p>Dear <strong>${user.name}</strong>,</p>
      <p>You requested a password reset. Please click the button below to set a new password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
      </div>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #007bff;">${resetUrl}</p>
      <p>This link will expire in 1 hour.</p>
      <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #777;">Regards,<br>College Administration</p>
    </div>
  `;

  return sendEmail(user.email, subject, text, html);
};
