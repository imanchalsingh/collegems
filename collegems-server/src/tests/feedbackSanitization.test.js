import test from "node:test";
import assert from "node:assert";
import express from "express";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import jwt from "jsonwebtoken";

// Local imports
import feedbackRoutes from "../routes/feedback.routes.js";
import User from "../models/User.model.js";

// Mock the environment variable
process.env.JWT_SECRET = "testsecret_feedback";

let mongoServer;
let studentToken;

const app = express();
app.use(express.json());
app.use("/api/feedback", feedbackRoutes);

test("Feedback Submission Security and Sanitization Tests", async (t) => {
  await t.test("Setup", async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    const student = await User.create({
      name: "Test Student",
      email: "student@test.com",
      password: "password123",
      role: "student",
      studentId: "S100",
      semester: "1",
      course: "BCA",
    });

    studentToken = jwt.sign(
      { id: student._id, role: student.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
  });

  await t.test("Valid Feedback Submission", async () => {
    const res = await request(app)
      .post("/api/feedback")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        category: "facility",
        title: "Library is great",
        message: "The new books in the library are very helpful.",
        rating: 5,
        isAnonymous: false,
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.message, "Feedback submitted successfully.");
    assert.strictEqual(res.body.feedback.title, "Library is great");
  });

  await t.test("Feedback Submission with Malicious XSS Payload", async () => {
    const res = await request(app)
      .post("/api/feedback")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        category: "course",
        title: "Malicious <script>alert('XSS')</script>",
        message: "Check out this link: <a href='javascript:alert(1)'>Click me</a> <img src=x onerror=alert('xss')>",
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.message, "Feedback submitted successfully.");
    
    // xss package neutralizes tags
    assert.ok(!res.body.feedback.title.includes("<script>"));
    assert.ok(!res.body.feedback.message.includes("onerror"));
    assert.ok(!res.body.feedback.message.includes("javascript:"));
  });

  await t.test("Validation Failure: Missing Required Fields", async () => {
    const res = await request(app)
      .post("/api/feedback")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        title: "Missing category and message",
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.message, "Validation failed");
    
    const errorFields = res.body.errors.map((e) => e.path);
    assert.ok(errorFields.includes("category"));
    assert.ok(errorFields.includes("message"));
  });

  await t.test("Validation Failure: Invalid Category", async () => {
    const res = await request(app)
      .post("/api/feedback")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        category: "invalid_category",
        title: "Test title",
        message: "Test message here for length.",
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.message, "Validation failed");
    assert.ok(res.body.errors.some((e) => e.path === "category" && e.msg === "Invalid category"));
  });

  await t.test("Teardown", async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });
});
