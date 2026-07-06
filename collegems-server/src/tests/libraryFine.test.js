import test from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import app from "../app.js";
import User from "../models/User.model.js";
import Book from "../models/Book.model.js";
import BookIssue from "../models/BookIssue.model.js";
import LibraryFine from "../models/LibraryFine.model.js";
import Notification from "../models/Notification.model.js";
import { processLibraryFines } from "../utils/cronJobs.js";
import jwt from "jsonwebtoken";

test("Library Fine Tracking Tests", async (t) => {
  let mongoServer;
  let studentToken;
  let student;
  let book;
  let overdueIssue;
  let notOverdueIssue;

  t.before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    const jwtSecret = process.env.JWT_SECRET || "testsecret";
    process.env.JWT_SECRET = jwtSecret;

    // Create Student
    student = await User.create({
      name: "Library Student",
      email: "library.student@test.com",
      password: "password123",
      role: "student",
      studentId: "S-LIB-100",
      semester: "3",
      course: "Computer Science",
    });

    studentToken = jwt.sign({ id: student._id, role: student.role }, jwtSecret);

    // Create Book
    book = await Book.create({
      title: "Test Library Book",
      author: "Jane Doe",
      category: "Fiction",
      isbn: "978-0131103627",
      quantity: 5,
      availableQuantity: 3,
    });

    // Create BookIssues
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(today.getDate() - 3);

    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);

    let exactlyDueIssue;
    let returnedBeforeDueIssue;

    // Issue 1: Overdue by 3 days
    overdueIssue = await BookIssue.create({
      book: book._id,
      user: student._id,
      dueDate: threeDaysAgo,
      status: "issued",
    });

    // Issue 2: Not yet due
    notOverdueIssue = await BookIssue.create({
      book: book._id,
      user: student._id,
      dueDate: threeDaysFromNow,
      status: "issued",
    });

    // Issue 3: Exactly due today (should not be overdue yet)
    exactlyDueIssue = await BookIssue.create({
      book: book._id,
      user: student._id,
      dueDate: today,
      status: "issued",
    });

    // Issue 4: Returned before due date
    returnedBeforeDueIssue = await BookIssue.create({
      book: book._id,
      user: student._id,
      dueDate: threeDaysAgo, // Would be overdue, but...
      returnDate: new Date(),
      status: "returned", // ...it was returned
    });
  });

  t.after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  await t.test("processLibraryFines correctly identifies overdue books and generates fines", async () => {
    await processLibraryFines();

    // Check BookIssue statuses
    const updatedOverdue = await BookIssue.findById(overdueIssue._id);
    const updatedNotOverdue = await BookIssue.findById(notOverdueIssue._id);

    assert.strictEqual(updatedOverdue.status, "overdue", "Status should be updated to overdue");
    assert.strictEqual(updatedNotOverdue.status, "issued", "Status should remain issued");

    // Check Fine generation
    const fine = await LibraryFine.findOne({ issue: overdueIssue._id });
    assert.ok(fine, "Fine record should be created");
    assert.strictEqual(fine.amount, 30, "Amount should be ₹10 * 3 days = ₹30");
    assert.strictEqual(fine.daysOverdue, 3);
    assert.strictEqual(fine.status, "Unpaid");

    // Check Notification generation
    const notification = await Notification.findOne({ recipient: student._id, type: "library" });
    assert.ok(notification, "Notification should be generated");
    assert.match(notification.message, /overdue/, "Notification message should mention overdue");
  });

  await t.test("GET /api/library/fines returns user fines", async () => {
    const res = await request(app)
      .get("/api/library/fines")
      .set("Authorization", `Bearer ${studentToken}`);

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.success);
    assert.strictEqual(res.body.fines.length, 1, "Should return exactly 1 fine");
    assert.strictEqual(res.body.fines[0].amount, 30);
    assert.strictEqual(res.body.fines[0].issue.book.title, "Test Library Book", "Populated book title should match");
  });

  await t.test("Edge Case: Book exactly on due date is not overdue", async () => {
    // Check exactly due book
    const issue = await BookIssue.findOne({ user: student._id, status: "issued", dueDate: { $gte: new Date(new Date().setHours(0,0,0,0)), $lt: new Date(new Date().setHours(23,59,59,999)) } });
    if(issue) {
      const fine = await LibraryFine.findOne({ issue: issue._id });
      assert.strictEqual(fine, null, "No fine should be generated for a book exactly on its due date");
    }
  });

  await t.test("Edge Case: Book returned early should not generate fine", async () => {
    // Find the returned issue
    const issue = await BookIssue.findOne({ status: "returned" });
    const fine = await LibraryFine.findOne({ issue: issue._id });
    assert.strictEqual(fine, null, "Returned books should not generate fines even if their original due date passes");
  });

  await t.test("POST /api/library/fines/:fineId/pay processes mock payment", async () => {
    const fine = await LibraryFine.findOne({ issue: overdueIssue._id });

    const res = await request(app)
      .post(`/api/library/fines/${fine._id}/pay`)
      .set("Authorization", `Bearer ${studentToken}`);

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.success);
    assert.strictEqual(res.body.message, "Fine paid successfully");

    // Verify DB update
    const updatedFine = await LibraryFine.findById(fine._id);
    assert.strictEqual(updatedFine.status, "Paid");
    assert.ok(updatedFine.paidOn, "paidOn date should be set");
  });

  await t.test("Edge Case: Attempting to pay an already paid fine returns error", async () => {
    const fine = await LibraryFine.findOne({ issue: overdueIssue._id }); // Already paid in the previous test

    const res = await request(app)
      .post(`/api/library/fines/${fine._id}/pay`)
      .set("Authorization", `Bearer ${studentToken}`);

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.message, "Fine is already paid");
  });

  await t.test("Edge Case: Attempting to pay with invalid ID", async () => {
    const invalidId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .post(`/api/library/fines/${invalidId}/pay`)
      .set("Authorization", `Bearer ${studentToken}`);

    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.message, "Fine not found");
  });
});
