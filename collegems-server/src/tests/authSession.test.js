import test from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import app from "../app.js";
import User from "../models/User.model.js";
import RefreshToken from "../models/RefreshToken.model.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { hashRefreshToken } from "../utils/token.service.js";

test("Authentication Session Management System Tests", async (t) => {
  let mongoServer;

  t.before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = "testsecretjwt";
    process.env.JWT_REFRESH_SECRET = "testsecretrefresh";
  });

  t.after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  let user;
  let currentCookie;
  let accessToken;

  await t.test("Register creates an unverified user", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Session User",
        email: "session.user@test.com",
        password: "Password@123",
        role: "student",
        studentId: "S999",
        course: "BCA",
        semester: "1",
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.message, "Registered successfully. Please check your email to verify your account.");
    assert.ok(res.body.user);

    user = await User.findOne({ email: "session.user@test.com" });
    assert.ok(user, "User should be created in DB");
    assert.strictEqual(user.isEmailVerified, false);
  });

  await t.test("Login fails for unverified user", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "session.user@test.com",
        password: "Password@123",
      });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.message, "Please verify your email address to login.");
    assert.strictEqual(res.body.isEmailVerified, false);
  });

  await t.test("Login after email verification creates a new session in DB and sets cookie", async () => {
    // Verify the user email
    user.isEmailVerified = true;
    await user.save({ validateBeforeSave: false });

    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "session.user@test.com",
        password: "Password@123",
      });

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.accessToken);
    accessToken = res.body.accessToken;

    const cookieHeader = res.headers["set-cookie"];
    assert.ok(cookieHeader);
    currentCookie = cookieHeader[0].split(";")[0];

    const sessions = await RefreshToken.find({ user: user._id });
    assert.strictEqual(sessions.length, 1, "Should have one session from login");
  });

  await t.test("Refresh rotates session, invalidates old, creates new, sets new cookie", async () => {
    const oldSessions = await RefreshToken.find({ user: user._id, isRevoked: false });
    assert.strictEqual(oldSessions.length, 1);

    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", [currentCookie]);

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.accessToken);

    const newCookieHeader = res.headers["set-cookie"];
    assert.ok(newCookieHeader);
    const newCookie = newCookieHeader[0].split(";")[0];
    assert.notStrictEqual(newCookie, currentCookie, "Cookie should change");

    // Old cookie was currentCookie. Let's find its session
    const oldRefreshToken = currentCookie.replace("refreshToken=", "");
    const oldHash = hashRefreshToken(oldRefreshToken);
    const oldSession = await RefreshToken.findOne({ token: oldHash });
    assert.strictEqual(oldSession.isRevoked, true, "Old session should be marked as revoked");

    // New cookie is newCookie
    const newRefreshToken = newCookie.replace("refreshToken=", "");
    const newHash = hashRefreshToken(newRefreshToken);
    const newSession = await RefreshToken.findOne({ token: newHash });
    assert.ok(newSession, "New session should exist in DB");
    assert.strictEqual(newSession.isRevoked, false, "New session should not be revoked");

    currentCookie = newCookie; // Update pointer
  });

  await t.test("Token Reuse Detection: Attempting to refresh with an old/revoked token invalidates all sessions", async () => {
    const mockToken = jwt.sign({ id: String(user._id), role: user.role, jti: crypto.randomUUID() }, process.env.JWT_REFRESH_SECRET);
    const mockHash = hashRefreshToken(mockToken);

    await RefreshToken.create({
      user: user._id,
      token: mockHash,
      isRevoked: true,
      expiresAt: new Date(Date.now() + 1000 * 60),
    });

    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", [`refreshToken=${mockToken}`]);

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.message, "Token has been revoked/reused");

    // Check that ALL user sessions were deleted/revoked
    const activeSessions = await RefreshToken.find({ user: user._id, isRevoked: false });
    assert.strictEqual(activeSessions.length, 0, "All sessions should be revoked or deleted");
  });

  await t.test("Expired Session: If the database session is expired, returns 401", async () => {
    const mockToken = jwt.sign({ id: String(user._id), role: user.role, jti: crypto.randomUUID() }, process.env.JWT_REFRESH_SECRET);
    const mockHash = hashRefreshToken(mockToken);

    await RefreshToken.create({
      user: user._id,
      token: mockHash,
      expiresAt: new Date(Date.now() - 1000 * 10), // expired 10 seconds ago
      isRevoked: false,
    });

    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", [`refreshToken=${mockToken}`]);

    assert.strictEqual(res.status, 401);
    assert.match(res.body.message, /expired/i);
  });

  await t.test("Logout revokes the active session and clears cookie", async () => {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: "session.user@test.com",
        password: "Password@123",
      });

    const cookie = loginRes.headers["set-cookie"][0].split(";")[0];
    const token = cookie.replace("refreshToken=", "");
    const hash = hashRefreshToken(token);

    let session = await RefreshToken.findOne({ token: hash });
    assert.strictEqual(session.isRevoked, false);

    const logoutRes = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", [cookie]);

    assert.strictEqual(logoutRes.status, 200);

    session = await RefreshToken.findOne({ token: hash });
    assert.strictEqual(session.isRevoked, true, "Session should be revoked after logout");

    const clearCookieHeader = logoutRes.headers["set-cookie"];
    assert.ok(clearCookieHeader[0].includes("refreshToken=;"));
  });

  await t.test("Get Sessions lists active unrevoked sessions", async () => {
    // Login twice to get two active sessions
    await request(app).post("/api/auth/login").send({ email: "session.user@test.com", password: "Password@123" });
    const r2 = await request(app).post("/api/auth/login").send({ email: "session.user@test.com", password: "Password@123" });

    const cookie2 = r2.headers["set-cookie"][0].split(";")[0];
    const tok = r2.body.accessToken;

    const res = await request(app)
      .get("/api/auth/sessions")
      .set("Authorization", `Bearer ${tok}`)
      .set("Cookie", [cookie2]);

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.strictEqual(res.body.length, 2);

    const currentSession = res.body.find((s) => s.isCurrent === true);
    assert.ok(currentSession, "One session should be flagged as current");
  });

  await t.test("Delete Session invalidates a specific session by ID", async () => {
    const loginRes = await request(app).post("/api/auth/login").send({ email: "session.user@test.com", password: "Password@123" });
    const tok = loginRes.body.accessToken;

    const sessionsRes = await request(app)
      .get("/api/auth/sessions")
      .set("Authorization", `Bearer ${tok}`);

    const targetSessionId = sessionsRes.body[0].id;

    const deleteRes = await request(app)
      .delete(`/api/auth/sessions/${targetSessionId}`)
      .set("Authorization", `Bearer ${tok}`);

    assert.strictEqual(deleteRes.status, 200);

    const newSessionsRes = await request(app)
      .get("/api/auth/sessions")
      .set("Authorization", `Bearer ${tok}`);

    assert.ok(!newSessionsRes.body.some((s) => s.id === targetSessionId), "Deleted session should not be in active list");
  });

  await t.test("Logout All invalidates all user sessions", async () => {
    const loginRes = await request(app).post("/api/auth/login").send({ email: "session.user@test.com", password: "Password@123" });
    const tok = loginRes.body.accessToken;

    const logoutAllRes = await request(app)
      .post("/api/auth/logout-all")
      .set("Authorization", `Bearer ${tok}`);

    assert.strictEqual(logoutAllRes.status, 200);

    const sessionsRes = await request(app)
      .get("/api/auth/sessions")
      .set("Authorization", `Bearer ${tok}`);

    assert.strictEqual(sessionsRes.body.length, 0, "No active sessions should remain");
  });

  await t.test("Password Change (Teacher) forces logout of all sessions", async () => {
    const regRes = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Teacher User",
        email: "teacher.user@test.com",
        password: "Password@123",
        role: "teacher",
        teacherId: "T999",
        department: "Computer Science",
      });

    assert.strictEqual(regRes.status, 201);
    const teacherUser = await User.findOne({ email: "teacher.user@test.com" });
    teacherUser.isEmailVerified = true;
    await teacherUser.save({ validateBeforeSave: false });

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: "teacher.user@test.com",
        password: "Password@123",
      });

    assert.strictEqual(loginRes.status, 200);
    const tok = loginRes.body.accessToken;

    let sessions = await RefreshToken.find({ user: teacherUser._id });
    assert.strictEqual(sessions.length, 1);

    const pwdRes = await request(app)
      .put("/api/users/me/password")
      .set("Authorization", `Bearer ${tok}`)
      .send({
        currentPassword: "Password@123",
        newPassword: "NewPassword@123",
      });

    assert.strictEqual(pwdRes.status, 200);

    sessions = await RefreshToken.find({ user: teacherUser._id, isRevoked: false });
    assert.strictEqual(sessions.length, 0, "All active sessions should be revoked after password change");
  });
});
