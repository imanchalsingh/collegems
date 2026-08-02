import test from "node:test";
import assert from "node:assert";
import crypto from "crypto";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { mock } from "node:test";
import nodemailer from "nodemailer";
import User from "../models/User.model.js";
import { comparePassword } from "../utils/hashPassword.js";

const setupMongo = async (t) => {
  let mongoServer;

  t.before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    process.env.JWT_SECRET = "testsecret";
    process.env.JWT_REFRESH_SECRET = "testsecret";
  });

  t.after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });
};

test("Forgot password stores a SHA-256 hash of the reset token", async (t) => {
  await setupMongo(t);

  const user = await User.create({
    name: "Reset User",
    email: "reset-hash@example.com",
    password: "Password123!",
    role: "student",
    studentId: "STU-HASH",
    semester: "1",
    course: "BCA",
  });

  let rawToken = null;
  mock.method(nodemailer, "createTransport", () => ({
    sendMail: async (mailOptions) => {
      const match = mailOptions.html.match(/token=([^"&]+)/);
      rawToken = match ? decodeURIComponent(match[1]) : null;
      return { messageId: "test" };
    },
  }));

  const { forgotPassword } = await import("../controllers/auth.controller.js");

  const req = { body: { email: user.email } };
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };

  await forgotPassword(req, res);

  const refreshedUser = await User.findById(user._id);

  assert.ok(rawToken, "the reset email should contain the raw token");
  assert.ok(refreshedUser.resetPasswordToken, "reset token should be stored");
  assert.notStrictEqual(refreshedUser.resetPasswordToken, rawToken, "stored token should not equal the raw token");

  const expectedHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  assert.strictEqual(refreshedUser.resetPasswordToken, expectedHash);

  mock.restoreAll();
});

test("Successful password reset clears reset token and updates password", async (t) => {
  await setupMongo(t);

  const user = await User.create({
    name: "Reset Success User",
    email: "reset-success@example.com",
    password: "Password123!",
    role: "student",
    studentId: "STU-SUCCESS",
    semester: "1",
    course: "BCA",
  });

  let rawToken = null;
  mock.method(nodemailer, "createTransport", () => ({
    sendMail: async (mailOptions) => {
      const match = mailOptions.html.match(/token=([^"&]+)/);
      rawToken = match ? decodeURIComponent(match[1]) : null;
      return { messageId: "test" };
    },
  }));

  const { forgotPassword, resetPassword } = await import("../controllers/auth.controller.js");

  const forgotReq = { body: { email: user.email } };
  const forgotRes = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };

  await forgotPassword(forgotReq, forgotRes);

  const createdUser = await User.findById(user._id);
  assert.ok(rawToken, "forgot password should create a reset token");

  const resetReq = { body: { token: rawToken, password: "NewPassword123!" } };
  const resetRes = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };

  await resetPassword(resetReq, resetRes);

  assert.strictEqual(resetRes.statusCode, 200);
  const refreshedUser = await User.findById(user._id);
  assert.ok(await comparePassword("NewPassword123!", refreshedUser.password));
  assert.strictEqual(refreshedUser.resetPasswordToken, undefined);
  assert.strictEqual(refreshedUser.resetPasswordExpires, undefined);

  mock.restoreAll();
});

test("Expired password reset token is rejected", async (t) => {
  await setupMongo(t);

  const user = await User.create({
    name: "Reset Expired User",
    email: "reset-expired@example.com",
    password: "Password123!",
    role: "student",
    studentId: "STU-EXPIRED",
    semester: "1",
    course: "BCA",
  });

  const rawToken = "expired-token";
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = Date.now() - 1000;
  await user.save();

  const { resetPassword } = await import("../controllers/auth.controller.js");

  const req = { body: { token: rawToken, password: "NewPassword123!" } };
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };

  await resetPassword(req, res);

  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body.message, "Invalid or expired password reset token");
});
