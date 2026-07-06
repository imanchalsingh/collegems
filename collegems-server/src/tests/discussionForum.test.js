import test from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import app from "../app.js";
import User from "../models/User.model.js";
import DiscussionQuestion from "../models/DiscussionQuestion.model.js";
import DiscussionAnswer from "../models/DiscussionAnswer.model.js";
import jwt from "jsonwebtoken";

test("Discussion Forum Tests", async (t) => {
  let mongoServer;
  let studentToken;
  let teacherToken;
  let studentUser;
  let teacherUser;
  let questionId;
  let answerId;

  t.before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    const jwtSecret = process.env.JWT_SECRET || "testsecret";
    process.env.JWT_SECRET = jwtSecret;

    studentUser = await User.create({
      name: "Discussion Student",
      email: "student_disc@test.com",
      password: "password123",
      role: "student",
      studentId: "S-201",
      semester: "6",
      course: "CS"
    });
    studentToken = jwt.sign({ id: studentUser._id, role: studentUser.role }, jwtSecret);

    teacherUser = await User.create({
      name: "Discussion Teacher",
      email: "teacher_disc@test.com",
      password: "password123",
      role: "teacher",
      teacherId: "T-201",
      department: "Computer Science"
    });
    teacherToken = jwt.sign({ id: teacherUser._id, role: teacherUser.role }, jwtSecret);
  });

  t.after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  await t.test("POST /api/discussions/questions allows student to ask question", async () => {
    const res = await request(app)
      .post("/api/discussions/questions")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        title: "How does Node.js event loop work?",
        content: "<p>I am confused about the phases.</p>",
        tags: ["Node.js", "Javascript"],
        department: "Computer Science"
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.title, "How does Node.js event loop work?");
    questionId = res.body.data._id;
  });

  await t.test("POST /api/discussions/questions/:id/answers allows teacher to answer", async () => {
    const res = await request(app)
      .post(`/api/discussions/questions/${questionId}/answers`)
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({
        content: "<p>The event loop has 6 phases...</p>"
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    answerId = res.body.data._id;
  });

  await t.test("PUT /api/discussions/questions/:id/vote toggles upvotes", async () => {
    // Upvote by teacher
    let res = await request(app)
      .put(`/api/discussions/questions/${questionId}/vote`)
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({ action: "upvote" });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.upvotedBy.length, 1);

    // Downvote by teacher (should remove upvote and add downvote)
    res = await request(app)
      .put(`/api/discussions/questions/${questionId}/vote`)
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({ action: "downvote" });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.upvotedBy.length, 0);
    assert.strictEqual(res.body.data.downvotedBy.length, 1);
  });

  await t.test("PUT /api/discussions/answers/:id/accept allows author to accept answer", async () => {
    // Teacher tries to accept (should fail)
    let res = await request(app)
      .put(`/api/discussions/answers/${answerId}/accept`)
      .set("Authorization", `Bearer ${teacherToken}`);
    
    assert.strictEqual(res.status, 403);

    // Student (author) accepts
    res = await request(app)
      .put(`/api/discussions/answers/${answerId}/accept`)
      .set("Authorization", `Bearer ${studentToken}`);
    
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.isAccepted, true);
  });

  await t.test("PUT /api/discussions/questions/:id/pin allows teacher to pin", async () => {
    // Student tries to pin (should fail)
    let res = await request(app)
      .put(`/api/discussions/questions/${questionId}/pin`)
      .set("Authorization", `Bearer ${studentToken}`);
    
    assert.strictEqual(res.status, 403);

    // Teacher pins
    res = await request(app)
      .put(`/api/discussions/questions/${questionId}/pin`)
      .set("Authorization", `Bearer ${teacherToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.isPinned, true);
  });

  await t.test("GET /api/discussions/questions returns questions with search/filter", async () => {
    const res = await request(app)
      .get("/api/discussions/questions?tags=Node.js")
      .set("Authorization", `Bearer ${studentToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.length, 1);
    assert.strictEqual(res.body.data[0].isPinned, true);
  });

  await t.test("GET /api/discussions/questions/:id increments views and returns answers", async () => {
    const res = await request(app)
      .get(`/api/discussions/questions/${questionId}`)
      .set("Authorization", `Bearer ${studentToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.question.views, 1);
    assert.strictEqual(res.body.data.answers.length, 1);
    assert.strictEqual(res.body.data.answers[0].isAccepted, true);
  });

  // --- EDGE CASES ---

  await t.test("Edge Case: Unauthorized student cannot delete someone else's question", async () => {
    const hackerStudent = await User.create({
      name: "Hacker Student",
      email: "hacker@test.com",
      password: "password123",
      role: "student",
      studentId: "S-999",
      semester: "1",
      course: "IT"
    });
    const hackerToken = jwt.sign({ id: hackerStudent._id, role: hackerStudent.role }, process.env.JWT_SECRET);

    const res = await request(app)
      .delete(`/api/discussions/questions/${questionId}`)
      .set("Authorization", `Bearer ${hackerToken}`);

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /Unauthorized to delete/);
  });

  await t.test("Edge Case: Fetching non-existent question returns 404", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .get(`/api/discussions/questions/${fakeId}`)
      .set("Authorization", `Bearer ${studentToken}`);

    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.success, false);
  });

  await t.test("Edge Case: Teacher can delete an answer (Moderation)", async () => {
    // Teacher is the author of answerId, so this works as author too,
    // but tests the delete functionality.
    const res = await request(app)
      .delete(`/api/discussions/answers/${answerId}`)
      .set("Authorization", `Bearer ${teacherToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
  });

  await t.test("Edge Case: Author can delete their own question", async () => {
    const res = await request(app)
      .delete(`/api/discussions/questions/${questionId}`)
      .set("Authorization", `Bearer ${studentToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
  });
});
