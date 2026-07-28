import test from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import app from "../app.js";
import User from "../models/User.model.js";
import jwt from "jsonwebtoken";
import { validateRegister } from "../middlewares/validation.middleware.js";

test("Authentication and Registration Flow Tests", async (t) => {
  let mongoServer;
  let adminToken;
  let teacherToken;
  let studentUser;
  const jwtSecret = "testsecret";

  t.before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Provide secrets to app
    process.env.JWT_SECRET = jwtSecret;
    process.env.JWT_REFRESH_SECRET = jwtSecret;

    // Create an Admin user
    const adminUser = await User.create({
      name: "Admin User",
      email: "admin@test.com",
      password: "Password123!",
      role: "admin",
    });
    adminToken = jwt.sign({ id: adminUser._id, role: adminUser.role }, jwtSecret);

    // Create a Teacher user
    const teacherUser = await User.create({
      name: "Teacher User",
      email: "teacher@test.com",
      password: "Password123!",
      role: "teacher",
      teacherId: "T-9999",
      department: "Mathematics",
    });
    teacherToken = jwt.sign({ id: teacherUser._id, role: teacherUser.role }, jwtSecret);

    // Create a student for parent registration testing
    studentUser = await User.create({
      name: "Student User",
      email: "student@test.com",
      password: "Password123!",
      role: "student",
      studentId: "STU-1234",
      semester: "1",
      course: "BCA",
    });
  });

  t.after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  await t.test("Public Registration: Student should be able to register successfully", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "New Student",
        email: "newstudent@test.com",
        password: "Password123!",
        role: "student",
        studentId: "STU-8888",
        semester: "1",
        course: "BCA",
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.message, "Registered successfully. Please check your email to verify your account.");
    assert.strictEqual(res.body.user.role, "student");
  });

  await t.test("Public Registration: Teacher should be able to register successfully", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "New Teacher",
        email: "newteacher@test.com",
        password: "Password123!",
        role: "teacher",
        teacherId: "T-7777",
        department: "Computer Science",
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.message, "Registered successfully. Please check your email to verify your account.");
    assert.strictEqual(res.body.user.role, "teacher");
  });

  await t.test("Public Registration: Parent should be able to register successfully", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "New Parent",
        email: "newparent@test.com",
        password: "Password123!",
        role: "parent",
        studentId: "STU-1234",
        childStudentId: "STU-1234",
        overrideDuplicates: true,
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.message, "Registered successfully. Please check your email to verify your account.");
    assert.strictEqual(res.body.user.role, "parent");
  });

  await t.test("Public Registration: HOD registration must be rejected", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Malicious HOD",
        email: "malhod@test.com",
        password: "Password123!",
        role: "hod",
        departmentCode: "CSE",
      });

    assert.ok(res.status === 400 || res.status === 403);
  });

  await t.test("Public Registration: Admin registration must be rejected", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Malicious Admin",
        email: "maladmin@test.com",
        password: "Password123!",
        role: "admin",
      });

    assert.ok(res.status === 400 || res.status === 403);
  });

  await t.test("Admin User Creation: Admin should be able to create HOD account", async () => {
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Authorized HOD",
        email: "authhod@test.com",
        password: "Password123!",
        role: "hod",
        departmentCode: "CSE",
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.message, "User created successfully");
    assert.strictEqual(res.body.user.role, "hod");
  });

  await t.test("Admin User Creation: Non-admin (teacher) should be forbidden from creating HOD account", async () => {
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({
        name: "HOD Created By Teacher",
        email: "teacherhod@test.com",
        password: "Password123!",
        role: "hod",
        departmentCode: "CSE",
      });

    assert.strictEqual(res.status, 403);
  });

  await t.test("Admin User Creation: Unauthenticated request should be unauthorized", async () => {
    const res = await request(app)
      .post("/api/users")
      .send({
        name: "Unauth HOD",
        email: "unauthhod@test.com",
        password: "Password123!",
        role: "hod",
        departmentCode: "CSE",
      });

    assert.strictEqual(res.status, 401);
  });

  await t.test("Admin User Creation: Validate institutional email domain", async () => {
    const originalDomain = process.env.COLLEGE_DOMAIN;
    process.env.COLLEGE_DOMAIN = "college.edu";

    try {
      // 1. Invalid domain should fail
      const resFail = await request(app)
        .post("/api/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Invalid Domain HOD",
          email: "hod@gmail.com",
          password: "Password123!",
          role: "hod",
          departmentCode: "CSE",
        });

      assert.strictEqual(resFail.status, 400);
      assert.ok(resFail.body.message.includes("Email must belong to domain"));

      // 2. Valid domain should succeed
      const resSuccess = await request(app)
        .post("/api/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Valid Domain HOD",
          email: "hod@college.edu",
          password: "Password123!",
          role: "hod",
          departmentCode: "CSE",
        });

      assert.strictEqual(resSuccess.status, 201);
    } finally {
      if (originalDomain === undefined) {
        delete process.env.COLLEGE_DOMAIN;
      } else {
        process.env.COLLEGE_DOMAIN = originalDomain;
      }
    }
  });

  await t.test("Admin User Creation: Validate department code", async () => {
    // CSE is valid (standard whitelist)
    const resSuccess = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Valid CSE HOD",
        email: "csehod@test.com",
        password: "Password123!",
        role: "hod",
        departmentCode: "CSE",
      });
    assert.strictEqual(resSuccess.status, 201);

    // XYZ is invalid (not in whitelist, and doesn't exist in DB)
    const resFail = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Invalid XYZ HOD",
        email: "xyzhod@test.com",
        password: "Password123!",
        role: "hod",
        departmentCode: "XYZ",
      });
    assert.strictEqual(resFail.status, 400);
    assert.ok(resFail.body.message.includes("Invalid or unauthorized department code"));
  });

  await t.test("Login: Unverified user login attempt should return 403 Forbidden", async () => {
    // 1. Register a new user
    const regRes = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Unverified User",
        email: "unverified.user@test.com",
        password: "Password123!",
        role: "student",
        studentId: "STU-9999",
        course: "BCA",
        semester: "1",
      });
    assert.strictEqual(regRes.status, 201);

    // 2. Attempt login without email verification
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: "unverified.user@test.com",
        password: "Password123!",
      });

    assert.strictEqual(loginRes.status, 403);
    assert.strictEqual(loginRes.body.message, "Please verify your email address to login.");
    assert.strictEqual(loginRes.body.isEmailVerified, false);
    assert.strictEqual(loginRes.body.email, "unverified.user@test.com");
  });

  await t.test("Login: Email verification flow allows user to log in successfully", async () => {
    const unverifiedUser = await User.findOne({ email: "unverified.user@test.com" });
    assert.ok(unverifiedUser);
    assert.ok(unverifiedUser.verificationToken);

    // 1. Verify email via endpoint
    const verifyRes = await request(app)
      .post("/api/auth/verify-email")
      .send({ token: unverifiedUser.verificationToken });

    assert.strictEqual(verifyRes.status, 200);
    assert.strictEqual(verifyRes.body.message, "Email verified successfully. You can now log in.");

    // 2. Attempt login after verification
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: "unverified.user@test.com",
        password: "Password123!",
      });

    assert.strictEqual(loginRes.status, 200);
    assert.ok(loginRes.body.accessToken);
    assert.strictEqual(loginRes.body.user.email, "unverified.user@test.com");
  });
});

// Validation middleware tests
const runValidation = (body) => {
  return new Promise((resolve, reject) => {
    const req = { body };
    const res = {
      statusCode: undefined,
      payload: undefined,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.payload = payload;
        resolve({ res: this, nextCalled: false });
        return this;
      },
    };

    let index = 0;
    const next = (err) => {
      if (err) {
        reject(err);
        return;
      }
      index++;
      if (index < validateRegister.length) {
        validateRegister[index](req, res, next);
      } else {
        resolve({ res, nextCalled: true });
      }
    };

    validateRegister[0](req, res, next);
  });
};

test("register validation accepts a strong password", async () => {
  const { res, nextCalled } = await runValidation({
    name: "Alice",
    email: "alice@example.com",
    password: "Password@123",
    role: "student",
  });

  assert.equal(res.statusCode, undefined);
  assert.equal(nextCalled, true);
});

test("register validation rejects passwords that do not meet the password policy", async (t) => {
  const weakPasswords = [
    "password",      // no uppercase, number, special character
    "PASSWORD123",   // no lowercase, special character
    "Pass123",       // too short
    "12345678",      // only numbers
    "Password123",   // no special character
    "Password@",     // no number
  ];

  for (const password of weakPasswords) {
    await t.test(`rejects "${password}"`, async () => {
      const { res, nextCalled } = await runValidation({
        name: "Alice",
        email: "alice@example.com",
        password,
        role: "student",
      });

      assert.equal(res.statusCode, 400);
      assert.equal(nextCalled, false);

      assert.match(
        res.payload.message,
        /Password/i
      );
    });
  }
});

test("register validation rejects missing password", async () => {
  const { res, nextCalled } = await runValidation({
    name: "Alice",
    email: "alice@example.com",
    role: "student",
  });

  assert.equal(res.statusCode, 400);
  assert.equal(nextCalled, false);
});

test("Rate limiting on password recovery and email verification endpoints", async (t) => {
  await t.test("POST /forgot-password should enforce rate limits after max requests", async () => {
    let lastRes;
    // Send 6 requests (max limit is 5)
    for (let i = 0; i < 6; i++) {
      lastRes = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: "test@example.com" });
    }
    assert.strictEqual(lastRes.status, 429);
  });

  await t.test("POST /resend-verification should enforce rate limits after max requests", async () => {
    let lastRes;
    // Send 6 requests (max limit is 5)
    for (let i = 0; i < 6; i++) {
      lastRes = await request(app)
        .post("/api/auth/resend-verification")
        .send({ email: "test@example.com" });
    }
    assert.strictEqual(lastRes.status, 429);
  });
});


