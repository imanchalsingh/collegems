import test from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import app from "../app.js";
import User from "../models/User.model.js";
import Fee from "../models/Fee.model.js";
import Salary from "../models/Salary.model.js";
import jwt from "jsonwebtoken";

test("Fee & Salary Payment Idempotency and Overpayment Tests", async (t) => {
  let mongoServer;
  let jwtSecret;
  let studentToken, studentUser;
  let hodToken;

  t.before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    jwtSecret = process.env.JWT_SECRET || "testsecret";
    process.env.JWT_SECRET = jwtSecret;

    studentUser = await User.create({
      name: "Fee Student",
      email: "feestudent@test.com",
      password: "password123",
      role: "student",
      studentId: "S-9001",
      semester: "3",
      course: "Computer Science",
    });
    studentToken = jwt.sign({ id: studentUser._id, role: studentUser.role }, jwtSecret);

    const hodUser = await User.create({
      name: "HOD Payer",
      email: "hodpayer@test.com",
      password: "password123",
      role: "hod",
      departmentCode: "CS",
    });
    hodToken = jwt.sign({ id: hodUser._id, role: hodUser.role }, jwtSecret);
  });

  t.after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  await t.test("POST /fee/pay rejects a duplicate idempotency key instead of double-crediting", async () => {
    const fee = await Fee.create({
      student: studentUser._id,
      total: 10000,
      paid: 0,
      dueDate: new Date(Date.now() + 86400000),
    });

    const key = "fee-key-1";
    const res1 = await request(app)
      .post("/api/fee/pay")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ amount: 9000, idempotencyKey: key });

    assert.strictEqual(res1.status, 200);
    assert.strictEqual(res1.body.data.paid, 9000);

    const res2 = await request(app)
      .post("/api/fee/pay")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ amount: 9000, idempotencyKey: key });

    assert.strictEqual(res2.status, 200);
    assert.strictEqual(res2.body.data.paid, 9000);

    const stored = await Fee.findById(fee._id);
    assert.strictEqual(stored.paid, 9000);
    assert.strictEqual(stored.installments.length, 1);
  });

  await t.test("POST /fee/pay rejects an amount exceeding the outstanding balance", async () => {
    const res = await request(app)
      .post("/api/fee/pay")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ amount: 5000, idempotencyKey: "fee-key-overpay" });

    assert.strictEqual(res.status, 400);
    assert.match(res.body.message, /exceeds outstanding balance/i);

    const stored = await Fee.findOne({ student: studentUser._id });
    assert.strictEqual(stored.paid, 9000);
  });

  await t.test("POST /fee/pay requires an idempotencyKey", async () => {
    const res = await request(app)
      .post("/api/fee/pay")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ amount: 100 });

    assert.strictEqual(res.status, 400);
  });

  await t.test("POST /salary/pay rejects a duplicate idempotency key instead of double-crediting", async () => {
    const teacher = await User.create({
      name: "Paid Teacher",
      email: "paidteacher@test.com",
      password: "password123",
      role: "teacher",
      teacherId: "T-9001",
      department: "Computer Science",
    });

    const salary = await Salary.create({
      staff: teacher._id,
      total: 50000,
      paid: 0,
      dueDate: new Date(Date.now() + 86400000),
    });

    const key = "salary-key-1";
    const res1 = await request(app)
      .post("/api/salary/pay")
      .set("Authorization", `Bearer ${hodToken}`)
      .send({ staff: teacher._id, amount: 14000, idempotencyKey: key });

    assert.strictEqual(res1.status, 200);
    assert.strictEqual(res1.body.salary.paid, 14000);

    const res2 = await request(app)
      .post("/api/salary/pay")
      .set("Authorization", `Bearer ${hodToken}`)
      .send({ staff: teacher._id, amount: 14000, idempotencyKey: key });

    assert.strictEqual(res2.status, 200);
    assert.strictEqual(res2.body.salary.paid, 14000);

    const stored = await Salary.findById(salary._id);
    assert.strictEqual(stored.paid, 14000);
    assert.strictEqual(stored.installments.length, 1);
  });

  await t.test("POST /salary/pay rejects an amount exceeding the outstanding balance (issue #592 repro)", async () => {
    const teacher = await User.create({
      name: "Overpaid Teacher",
      email: "overpaidteacher@test.com",
      password: "password123",
      role: "teacher",
      teacherId: "T-9002",
      department: "Computer Science",
    });

    await Salary.create({
      staff: teacher._id,
      total: 10000,
      paid: 9000,
      dueDate: new Date(Date.now() + 86400000),
    });

    const res = await request(app)
      .post("/api/salary/pay")
      .set("Authorization", `Bearer ${hodToken}`)
      .send({ staff: teacher._id, amount: 5000, idempotencyKey: "salary-key-overpay" });

    assert.strictEqual(res.status, 400);
    assert.match(res.body.message, /exceeds outstanding balance/i);

    const stored = await Salary.findOne({ staff: teacher._id });
    assert.strictEqual(stored.paid, 9000);
  });
});
