import User from "../models/User.model.js";

import { hashPassword, comparePassword } from "../utils/hashPassword.js";

import { logAction } from "../utils/auditService.js";

import { checkPotentialDuplicates } from "../services/duplicateDetection.service.js";
import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  verifyRefreshToken
} from "../utils/token.service.js";

import {
  createSession,
  revokeSession,
  revokeAllSessions,
  findSession,
  rotateSession,
  updateSessionUsage,
} from "../utils/session.service.js";

import RefreshToken from "../models/RefreshToken.model.js";
import crypto from "crypto";
import { sendVerificationEmail, sendPasswordResetEmail } from "../utils/email.js";

const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const REFRESH_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: REFRESH_TOKEN_MAX_AGE,
  path: "/",
};
const COLLEGE_DOMAIN = process.env.COLLEGE_DOMAIN || "";



const normalizeEmail = (email) => email?.trim().toLowerCase();



const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");



export const register = async (req, res) => {

  try {

    const {

      name,

      email,

      password,

      role,

      studentId,

      teacherId,

      department,

      departmentCode,

      semester,

      course,

      childStudentId,

      phone,

      dob,

      overrideDuplicates

    } = req.body || {};



    if (!name || !email || !password || !role) {

      return res.status(400).json({ message: "All fields required" });

    }

    const PUBLIC_REGISTRATION_ROLES = ["student", "teacher", "parent"];
    if (!PUBLIC_REGISTRATION_ROLES.includes(role)) {
      return res.status(403).json({
        message: "This role cannot be created through public registration",
      });
    }

    // Role-specific checks

    let userData = {

      name,

      email: normalizeEmail(email),

      password: await hashPassword(password, 8),

      role,

      phone,

      dob

    };



    if (role === "student") {

      if (!studentId) {

        return res.status(400).json({ message: "Student ID required" });

      }

      if (!semester || !course) {
        return res
          .status(400)
          .json({ message: "Semester and course required for student" });
      }
      if (!course) {
        return res
          .status(400)
          .json({ message: "Course required for student" });
      }

      // Hard check, independent of overrideDuplicates/checkPotentialDuplicates
      // below - a Student ID collision must never be bypassable.
      const existingStudent = await User.findOne({ studentId, role: "student" });
      if (existingStudent) {
        return res.status(409).json({ message: "A student with this Student ID already exists" });
      }

      userData = { ...userData, studentId, semester, course};
      if (department) {
        userData.department = department;
      }
    }



    if (role === "teacher") {

      if (!teacherId) {

        return res.status(400).json({ message: "Teacher ID required" });

      }

      if (!department) {

        return res.status(400).json({ message: "Department required" });

      }

      userData = { ...userData, teacherId, department };

    }



    if (role === "parent") {

      if (!studentId) {

        return res.status(400).json({ message: "Child's Student ID is required for parent registration" });

      }

      const studentExists = await User.findOne({ studentId, role: "student" });

      if (!studentExists) {

        return res.status(400).json({ message: "Student with the provided ID does not exist" });

      }

      userData = { ...userData, studentId };

    }


    if (role === "parent") {

      if (!childStudentId) {

        return res.status(400).json({ message: "Child's Student ID required" });

      }

      const student = await User.findOne({ studentId: childStudentId, role: "student" });

      if (!student) {

        return res.status(404).json({ message: "Student with this ID does not exist" });

      }

      userData = { ...userData, childId: student._id };

    }



    // Check existing user strictly by email

    const exists = await User.findOne({ email: normalizeEmail(email) });

    if (exists) return res.status(400).json({ message: "User already exists with this email" });



    // Interactive Duplicate Detection Handshake

    if (!overrideDuplicates) {

      const duplicates = await checkPotentialDuplicates(userData);



      if (duplicates.length > 0) {

        return res.status(409).json({

          isDuplicateWarning: true,

          message: "Potential duplicate records found.",

          matches: duplicates

        });

      }

    }



    // Create user

    const user = await User.create(userData);

    // Generate Verification Token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    user.verificationToken = verificationToken;
    user.verificationTokenExpires = verificationTokenExpires;
    await user.save({ validateBeforeSave: false });

    // Send Verification Email
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;
    await sendVerificationEmail(user, verificationUrl);

    // Note: Not generating access tokens here because user must verify email first.
    res.status(201).json({
      message: "Registered successfully. Please check your email to verify your account.",
      user: { id: user._id, name: user.name, role: user.role },
    });



    // Log the action

    await logAction(user._id, "REGISTER", "Auth", user._id, { role: user.role, email: user.email });

  } catch (err) {

    console.error(err);

    res.status(500).json({ message: "Server error" });

  }

};



export const login = async (req, res) => {

  try {

    const body = req.body || {};

    const email = normalizeEmail(body.email);

    const { password } = body;



    if (!email || !password) {

      return res.status(400).json({ message: "Email and password required" });

    }



    const user = await User.findOne({

      email: new RegExp(`^${escapeRegExp(email)}$`, "i"),

    }).select("+password");

    if (!user) {

      return res.status(400).json({ message: "Invalid credentials" });

    }



    const match = await comparePassword(password, user.password);

    if (!match) {

      return res.status(400).json({ message: "Invalid credentials" });

    }

    // if (!user.isEmailVerified) {
    //   return res.status(403).json({ 
    //     message: "Please verify your email address to login.",
    //     isEmailVerified: false,
    //     email: user.email
    //   });
    // }

    if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {

      console.error("JWT secrets are not configured");

      return res.status(500).json({ message: "Authentication not configured" });

    }



    const accessToken = generateAccessToken(user);

    const refreshToken = generateRefreshToken(user);



    // Hash refresh token & create DB session

    const tokenHash = hashRefreshToken(refreshToken);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await createSession({

      userId: user._id,

      tokenHash,

      deviceInfo: req.deviceInfo,

      ipAddress: req.ipAddress,

      expiresAt,

    });



    res.cookie("refreshToken", refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);



    res.json({

      accessToken,

      user: {

        id: user._id,

        name: user.name,

        email: user.email,

        role: user.role,

        studentId: user.studentId,

        semester: user.semester,

        course: user.course,

        teacherId: user.teacherId,

        department: user.department,

        departmentCode: user.departmentCode,

        childId: user.childId,

      },

    });



    // Update telemetry

    user.lastLogin = Date.now();

    user.loginCount = (user.loginCount || 0) + 1;

    await user.save({ validateBeforeSave: false });



    // Log the login

    await logAction(user._id, "LOGIN", "Auth", user._id, { role: user.role, email: user.email });

  } catch (err) {

    console.error("Login error:", err);

    res.status(500).json({ message: "Server error" });

  }

};



export const refresh = async (req, res) => {

  try {

    const refreshToken = req.cookies?.refreshToken;



    if (!refreshToken) {

      return res.status(401).json({ message: "Refresh token missing" });

    }



    let decoded;

    try {

      decoded = verifyRefreshToken(refreshToken);

    } catch (err) {

      return res.status(403).json({ message: "Invalid refresh token" });

    }



    const tokenHash = hashRefreshToken(refreshToken);

    const session = await findSession(tokenHash);



    if (!session) {

      return res.status(401).json({ message: "Session not found or expired" });

    }



    // Token Reuse Detection

    if (session.isRevoked) {

      // Revoke all sessions for this user

      await revokeAllSessions(session.user);

      res.clearCookie("refreshToken", REFRESH_TOKEN_COOKIE_OPTIONS);

      return res.status(401).json({ message: "Token has been revoked/reused" });

    }



    // Expiry check

    if (session.expiresAt && session.expiresAt < new Date()) {

      return res.status(401).json({ message: "Session expired" });

    }



    const user = await User.findById(decoded.id);

    if (!user) {

      return res.status(401).json({ message: "User not found" });

    }



    // Generate new tokens

    const newAccessToken = generateAccessToken(user);

    const newRefreshToken = generateRefreshToken(user);



    // Rotate session: create new session, mark old session as revoked

    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const newTokenHash = hashRefreshToken(newRefreshToken);



    await rotateSession({

      oldTokenHash: tokenHash,

      newTokenHash,

      newExpiresAt,

      deviceInfo: req.deviceInfo,

      ipAddress: req.ipAddress,

    });



    res.cookie("refreshToken", newRefreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);



    res.json({ accessToken: newAccessToken });

  } catch (err) {

    console.error("Refresh error:", err);

    res.status(500).json({ message: "Server error" });

  }

};



export const logout = async (req, res) => {

  try {

    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {

      const tokenHash = hashRefreshToken(refreshToken);

      await revokeSession(tokenHash);

    }



    res.clearCookie("refreshToken", REFRESH_TOKEN_COOKIE_OPTIONS);

    res.json({ message: "Logged out successfully" });

  } catch (err) {

    console.error("Logout error:", err);

    res.status(500).json({ message: "Server error" });

  }

};

export const getSessions = async (req, res) => {

  try {

    const userId = req.user.id;

    const sessions = await RefreshToken.find({

      user: userId,

      isRevoked: false,

      expiresAt: { $gt: new Date() },

    });



    const refreshToken = req.cookies?.refreshToken;

    const currentTokenHash = refreshToken ? hashRefreshToken(refreshToken) : null;



    const formattedSessions = sessions.map((session) => ({

      id: session._id,

      deviceInfo: session.deviceInfo || { browser: "Unknown", os: "Unknown", device: "Unknown" },

      ipAddress: session.ipAddress || "Unknown",

      lastUsedAt: session.lastUsedAt || session.createdAt,

      expiresAt: session.expiresAt,

      isCurrent: currentTokenHash === session.token,

    }));



    res.json(formattedSessions);

  } catch (err) {

    console.error("Get sessions error:", err);

    res.status(500).json({ message: "Server error" });

  }

};



export const logoutAll = async (req, res) => {

  try {

    await revokeAllSessions(req.user.id);

    res.clearCookie("refreshToken", REFRESH_TOKEN_COOKIE_OPTIONS);

    res.json({ message: "Logged out from all sessions successfully" });

  } catch (err) {

    console.error("Logout all error:", err);

    res.status(500).json({ message: "Server error" });

  }

};



export const deleteSession = async (req, res) => {

  try {

    const { id } = req.params;

    const session = await RefreshToken.findOne({ _id: id, user: req.user.id });



    if (!session) {

      return res.status(404).json({ message: "Session not found" });

    }



    session.isRevoked = true;

    await session.save();



    // Clear cookie if current session was revoked

    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {

      const tokenHash = hashRefreshToken(refreshToken);

      if (session.token === tokenHash) {

        res.clearCookie("refreshToken", REFRESH_TOKEN_COOKIE_OPTIONS);

      }

    }



    res.json({ message: "Session revoked successfully" });

  } catch (err) {

    console.error("Delete session error:", err);

    res.status(500).json({ message: "Server error" });

  }

};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "Token is required" });

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired verification token" });
    }

    user.isEmailVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save({ validateBeforeSave: false });

    // Log verification
    await logAction(user._id, "VERIFY_EMAIL", "Auth", user._id, { email: user.email });

    res.json({ message: "Email verified successfully. You can now log in." });
  } catch (err) {
    console.error("Verify email error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email: normalizeEmail(email) });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: "Email is already verified" });
    }

    // Generate new token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
    user.verificationToken = verificationToken;
    user.verificationTokenExpires = verificationTokenExpires;
    await user.save({ validateBeforeSave: false });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;
    await sendVerificationEmail(user, verificationUrl);

    res.json({ message: "Verification email sent successfully" });
  } catch (err) {
    console.error("Resend verification email error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email: normalizeEmail(email) });
    if (!user) {
      // Don't leak whether user exists or not
      return res.json({ message: "If an account with that email exists, we have sent a password reset link." });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpires = Date.now() + 60 * 60 * 1000; // 1 hour

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpires;
    await user.save({ validateBeforeSave: false });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
    await sendPasswordResetEmail(user, resetUrl);

    res.json({ message: "If an account with that email exists, we have sent a password reset link." });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: "Token and new password are required" });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired password reset token" });
    }

    user.password = await hashPassword(password, 8);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save({ validateBeforeSave: false });

    await logAction(user._id, "RESET_PASSWORD", "Auth", user._id, { email: user.email });

    res.json({ message: "Password has been successfully reset" });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Server error" });
  }
}
