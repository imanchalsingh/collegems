import test from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import app from "../app.js"; // Express app
import User from "../models/User.model.js";
import Course from "../models/Course.model.js";
import Attendance from "../models/Attendance.model.js";
import TeacherAttendance from "../models/TeacherAttendance.js";
import Results from "../models/Results.model.js";
import Leave from "../models/Leave.model.js";
import Assignment from "../models/Assignment.model.js";
import Salary from "../models/Salary.model.js";
import jwt from "jsonwebtoken";

test("Report Generation API Tests", async (t) => {
  let mongoServer;
  let hodToken;
  let hodUser;
  let student1, student2;
  let teacher;
  let course1, course2;

  t.before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    const jwtSecret = process.env.JWT_SECRET || "testsecret";
    process.env.JWT_SECRET = jwtSecret;

    // Create HOD
    hodUser = await User.create({
      name: "Dr. Alice Vance",
      email: "hod@test.com",
      password: "password123",
      role: "hod",
      departmentCode: "CSE",
    });

    hodToken = jwt.sign({ id: hodUser._id, role: hodUser.role }, jwtSecret);

    // Create Teacher
    teacher = await User.create({
      name: "Dr. David Evans",
      email: "david.evans@test.com",
      password: "password123",
      role: "teacher",
      teacherId: "T-1001",
      department: "Computer Science",
    });

    // Create Students
    student1 = await User.create({
      name: "Alice Johnson",
      email: "alice.johnson@test.com",
      password: "password123",
      role: "student",
      studentId: "S-2001",
      semester: "3",
      course: "Computer Science",
    });

    student2 = await User.create({
      name: "Bob Smith",
      email: "bob.smith@test.com",
      password: "password123",
      role: "student",
      studentId: "S-2002",
      semester: "3",
      course: "Computer Science",
    });

    // Create Courses
    course1 = await Course.create({
      name: "Computer Networks",
      code: "CS-301",
      department: "Computer Science",
      semester: 3,
      teacher: teacher._id,
    });

    course2 = await Course.create({
      name: "Operating Systems",
      code: "CS-302",
      department: "Computer Science",
      semester: 3,
      teacher: teacher._id,
    });

    // Create Attendance (Present on 2026-05-18, Absent on 2026-05-19)
    await Attendance.create([
      { student: student1._id, course: course1._id, date: "2026-05-18", status: "present" },
      { student: student1._id, course: course1._id, date: "2026-05-19", status: "absent" },
      { student: student2._id, course: course1._id, date: "2026-05-18", status: "present" },
    ]);

    // Create Teacher Attendance
    await TeacherAttendance.create([
      { teacher: teacher._id, date: new Date("2026-05-18T00:00:00.000Z"), status: "Present", markedBy: hodUser._id },
      { teacher: teacher._id, date: new Date("2026-05-19T00:00:00.000Z"), status: "Late", markedBy: hodUser._id },
    ]);

    // Create Student Results
    await Results.create([
      { studentId: student1._id, courseId: course1._id, semester: "3", internalMarks: 25, externalMarks: 62, practicalMarks: 10, totalMarks: 97, grade: "A+", status: "published" },
      { studentId: student2._id, courseId: course1._id, semester: "3", internalMarks: 18, externalMarks: 48, practicalMarks: 8, totalMarks: 74, grade: "B", status: "published" },
    ]);

    // Create Leaves
    await Leave.create([
      { user: student1._id, role: "student", subject: "Flu", startDate: new Date("2026-05-20T00:00:00.000Z"), endDate: new Date("2026-05-22T00:00:00.000Z"), reason: "Flu", status: "Approved", type: "Sick" },
      { user: teacher._id, role: "teacher", subject: "Conf", startDate: new Date("2026-05-21T00:00:00.000Z"), endDate: new Date("2026-05-22T00:00:00.000Z"), reason: "Conf", status: "Approved", type: "Duty" },
    ]);

    // Create Assignments and submissions
    await Assignment.create([
      {
        title: "Socket Programming Project",
        course: course1._id,
        teacher: teacher._id,
        dueDate: new Date("2026-05-24T00:00:00.000Z"),
        submissions: [
          { student: student1._id, submittedAt: new Date("2026-05-22T00:00:00.000Z"), marks: 95, status: "graded" },
          { student: student2._id, submittedAt: new Date("2026-05-24T00:00:00.000Z"), marks: 82, status: "graded" },
        ],
      },
    ]);

    // Create Salary
    await Salary.create([
      { staff: teacher._id, total: 95000, paid: 95000, dueDate: new Date("2026-05-01T00:00:00.000Z"), status: "Paid" },
    ]);
  });

  t.after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  await t.test("Generate report for student role (Full list)", async () => {
    const res = await request(app)
      .get("/api/reports/generate?type=student")
      .set("Authorization", `Bearer ${hodToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.type, "student");
    assert.ok(Array.isArray(res.body.data));
    assert.strictEqual(res.body.data.length, 2);

    // Verify first student data structure
    const s1Report = res.body.data.find(s => s.name === "Alice Johnson");
    assert.ok(s1Report);
    assert.strictEqual(s1Report.studentId, "S-2001");
    assert.strictEqual(s1Report.email, "alice.johnson@test.com");
    assert.strictEqual(s1Report.attendance.total, 2);
    assert.strictEqual(s1Report.attendance.present, 1);
    assert.strictEqual(s1Report.attendance.absent, 1);
    assert.strictEqual(s1Report.attendance.percentage, 50);
    assert.strictEqual(s1Report.results.length, 1);
    assert.strictEqual(s1Report.results[0].totalMarks, 97);
    assert.strictEqual(s1Report.results[0].grade, "A+");
    assert.strictEqual(s1Report.leaves.length, 1);
    assert.strictEqual(s1Report.leaves[0].type, "Sick");
    assert.strictEqual(s1Report.submissions.length, 1);
    assert.strictEqual(s1Report.submissions[0].marks, 95);
  });

  await t.test("Generate report for student role filtered by userId", async () => {
    const res = await request(app)
      .get(`/api/reports/generate?type=student&userId=${student2._id}`)
      .set("Authorization", `Bearer ${hodToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.length, 1);
    assert.strictEqual(res.body.data[0].name, "Bob Smith");
    assert.strictEqual(res.body.data[0].attendance.total, 1);
    assert.strictEqual(res.body.data[0].attendance.present, 1);
  });

  await t.test("Generate report for teacher role (Full list)", async () => {
    const res = await request(app)
      .get("/api/reports/generate?type=teacher")
      .set("Authorization", `Bearer ${hodToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.type, "teacher");
    assert.ok(Array.isArray(res.body.data));
    assert.strictEqual(res.body.data.length, 1);

    const tReport = res.body.data[0];
    assert.strictEqual(tReport.name, "Dr. David Evans");
    assert.strictEqual(tReport.teacherId, "T-1001");
    assert.strictEqual(tReport.courses.length, 2);
    assert.strictEqual(tReport.attendance.total, 2);
    assert.strictEqual(tReport.attendance.present, 1);
    assert.strictEqual(tReport.attendance.late, 1);
    // 1 present + 1 late (1 * 0.5) / 2 = 75%
    assert.strictEqual(tReport.attendance.percentage, 75);
    assert.strictEqual(tReport.leaves.length, 1);
    assert.strictEqual(tReport.leaves[0].type, "Duty");
    assert.strictEqual(tReport.salaries.length, 1);
    assert.strictEqual(tReport.salaries[0].total, 95000);
  });
});
