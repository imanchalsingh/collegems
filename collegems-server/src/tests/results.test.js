import test from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import app from "../app.js";
import User from "../models/User.model.js";
import Course from "../models/Course.model.js";
import Results from "../models/Results.model.js";
import AuditLog from "../models/AuditLog.model.js";
import jwt from "jsonwebtoken";

test("Exam Results Authorization & Integrity API Tests", async (t) => {
  let mongoServer;
  let jwtSecret;
  let studentToken, studentUser;
  let student2Token, student2User;
  let teacher1Token, teacher1User;
  let teacher2Token, teacher2User;
  let parentToken, parentUser;
  let hodToken, hodUser;
  let course1, course2;

  t.before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    jwtSecret = process.env.JWT_SECRET || "testsecret";
    process.env.JWT_SECRET = jwtSecret;

    // Create HOD
    hodUser = await User.create({
      name: "HOD Professor",
      email: "hod.results@test.com",
      password: "password123",
      role: "hod",
      departmentCode: "CS",
    });
    hodToken = jwt.sign({ id: hodUser._id, role: hodUser.role }, jwtSecret);

    // Create Teacher 1
    teacher1User = await User.create({
      name: "Teacher One",
      email: "teacher1@test.com",
      password: "password123",
      role: "teacher",
      teacherId: "T-1001",
      department: "Computer Science",
    });
    teacher1Token = jwt.sign({ id: teacher1User._id, role: teacher1User.role }, jwtSecret);

    // Create Teacher 2
    teacher2User = await User.create({
      name: "Teacher Two",
      email: "teacher2@test.com",
      password: "password123",
      role: "teacher",
      teacherId: "T-1002",
      department: "Computer Science",
    });
    teacher2Token = jwt.sign({ id: teacher2User._id, role: teacher2User.role }, jwtSecret);

    // Create Student 1 (eligible for CS courses in sem 3)
    studentUser = await User.create({
      name: "Eligible Student",
      email: "student1@test.com",
      password: "password123",
      role: "student",
      studentId: "S-2001",
      semester: "3",
      course: "Computer Science",
    });
    studentToken = jwt.sign({ id: studentUser._id, role: studentUser.role }, jwtSecret);

    // Create Student 2 (Mechanical Engineering, semester 4 - ineligible for CS sem 3)
    student2User = await User.create({
      name: "Ineligible Student",
      email: "student2@test.com",
      password: "password123",
      role: "student",
      studentId: "S-2002",
      semester: "4",
      course: "Mechanical Engineering",
    });
    student2Token = jwt.sign({ id: student2User._id, role: student2User.role }, jwtSecret);

    // Create Parent
    parentUser = await User.create({
      name: "Parent User",
      email: "parent@test.com",
      password: "password123",
      role: "parent",
      childId: studentUser._id,
      studentId: "S-2001", // linked studentId
    });
    parentToken = jwt.sign({ id: parentUser._id, role: parentUser.role }, jwtSecret);

    // Create Courses
    course1 = await Course.create({
      name: "Computer Networks",
      code: "CS-301",
      department: "Computer Science",
      semester: 3,
      teacher: teacher1User._id,
    });

    course2 = await Course.create({
      name: "Operating Systems",
      code: "CS-302",
      department: "Computer Science",
      semester: 3,
      teacher: teacher2User._id,
    });
  });

  t.after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  await t.test("POST /create should reject student requests", async () => {
    const res = await request(app)
      .post("/api/results/create")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        studentId: studentUser._id,
        courseId: course1._id,
        internalMarks: 20,
        externalMarks: 50,
        totalMarks: 70,
        grade: "B",
      });

    assert.strictEqual(res.status, 403);
    assert.match(res.body.message, /Forbidden/i);
  });

  await t.test("POST /create should reject parent requests", async () => {
    const res = await request(app)
      .post("/api/results/create")
      .set("Authorization", `Bearer ${parentToken}`)
      .send({
        studentId: studentUser._id,
        courseId: course1._id,
        internalMarks: 20,
        externalMarks: 50,
        totalMarks: 70,
        grade: "B",
      });

    assert.strictEqual(res.status, 403);
    assert.match(res.body.message, /Forbidden/i);
  });

  await t.test("POST /create should reject teacher requests for courses they do not teach", async () => {
    const res = await request(app)
      .post("/api/results/create")
      .set("Authorization", `Bearer ${teacher1Token}`)
      .send({
        studentId: studentUser._id,
        courseId: course2._id, // Owned by teacher 2
        internalMarks: 20,
        externalMarks: 50,
        totalMarks: 70,
        grade: "B",
      });

    assert.strictEqual(res.status, 403);
    assert.match(res.body.message, /Not authorized to manage results for this course/i);
  });

  await t.test("POST /create should reject grading for students not matching course criteria", async () => {
    const res = await request(app)
      .post("/api/results/create")
      .set("Authorization", `Bearer ${teacher1Token}`)
      .send({
        studentId: student2User._id, // Mechanical sem 4 student
        courseId: course1._id, // CS sem 3 course
        internalMarks: 20,
        externalMarks: 50,
        totalMarks: 70,
        grade: "B",
      });

    assert.strictEqual(res.status, 403);
    assert.match(res.body.message, /student is not in the course's department or semester/i);
  });

  await t.test("POST /create should allow teacher to grade eligible student for owned course and log audit log", async () => {
    const res = await request(app)
      .post("/api/results/create")
      .set("Authorization", `Bearer ${teacher1Token}`)
      .send({
        studentId: studentUser._id,
        courseId: course1._id,
        semester: "3",
        internalMarks: 22,
        externalMarks: 58,
        totalMarks: 80,
        grade: "A",
        status: "draft",
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.studentId, studentUser._id.toString());
    assert.strictEqual(res.body.courseId, course1._id.toString());
    assert.strictEqual(res.body.grade, "A");
    assert.strictEqual(res.body.status, "draft");

    // Verify audit log creation
    const logs = await AuditLog.find({ action: "CREATE_RESULT" });
    assert.strictEqual(logs.length, 1);
    assert.strictEqual(logs[0].user.toString(), teacher1User._id.toString());
    assert.strictEqual(logs[0].details.userRole, "teacher");
    assert.strictEqual(logs[0].details.studentId.toString(), studentUser._id.toString());
    assert.strictEqual(logs[0].details.newValue.grade, "A");
  });

  await t.test("POST /create should allow HOD to grade eligible student for any course", async () => {
    const res = await request(app)
      .post("/api/results/create")
      .set("Authorization", `Bearer ${hodToken}`)
      .send({
        studentId: studentUser._id,
        courseId: course2._id, // Owned by teacher 2, but HOD can create
        semester: "3",
        internalMarks: 25,
        externalMarks: 65,
        totalMarks: 90,
        grade: "A+",
        status: "draft",
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.grade, "A+");
  });

  await t.test("PUT /publish should reject teacher publish requests", async () => {
    const resultObj = await Results.create({
      studentId: studentUser._id,
      courseId: course1._id,
      semester: "3",
      internalMarks: 20,
      externalMarks: 50,
      totalMarks: 70,
      grade: "B",
      status: "draft",
    });

    const res = await request(app)
      .put(`/api/results/${resultObj._id}/publish`)
      .set("Authorization", `Bearer ${teacher1Token}`)
      .send();

    assert.strictEqual(res.status, 403);
    assert.match(res.body.message, /Forbidden/i);
  });

  await t.test("PUT /publish should allow HOD publish requests and log audit log", async () => {
    const resultObj = await Results.create({
      studentId: studentUser._id,
      courseId: course1._id,
      semester: "3",
      internalMarks: 20,
      externalMarks: 50,
      totalMarks: 70,
      grade: "B",
      status: "draft",
    });

    const res = await request(app)
      .put(`/api/results/${resultObj._id}/publish`)
      .set("Authorization", `Bearer ${hodToken}`)
      .send();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, "published");

    // Verify audit log creation
    const logs = await AuditLog.find({ action: "PUBLISH_RESULT" });
    assert.strictEqual(logs.length, 1);
    assert.strictEqual(logs[0].user.toString(), hodUser._id.toString());
    assert.strictEqual(logs[0].details.userRole, "hod");
    assert.strictEqual(logs[0].details.studentId.toString(), studentUser._id.toString());
    assert.strictEqual(logs[0].details.previousValue.status, "draft");
    assert.strictEqual(logs[0].details.newValue.status, "published");
  });

  await t.test("GET /my should return published results with proper schema fields for student", async () => {
    const res = await request(app)
      .get("/api/results/my")
      .set("Authorization", `Bearer ${studentToken}`);

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
    // The previously published result in the DB should be returned
    assert.ok(res.body.length > 0);
    const result = res.body[0];
    assert.ok(result.internalMarks !== undefined);
    assert.ok(result.externalMarks !== undefined);
    assert.ok(result.totalMarks !== undefined);
    assert.ok(result.grade !== undefined);
    assert.ok(result.semester !== undefined);
    assert.ok(result.courseId !== null);
  });
});
