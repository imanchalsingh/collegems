import mongoose from "mongoose";
import dotenv from "dotenv";
import { hashPassword } from "./hashPassword.js";

// Load env variables
dotenv.config();

// Import models
import User from "../models/User.model.js";
import Course from "../models/Course.model.js";
import Attendance from "../models/Attendance.model.js";
import TeacherAttendance from "../models/TeacherAttendance.js";
import Results from "../models/Results.model.js";
import Leave from "../models/Leave.model.js";
import Assignment from "../models/Assignment.model.js";
import Salary from "../models/Salary.model.js";

// FIX (Bug 3): Helper to produce a UTC-midnight Date from a YYYY-MM-DD string.
// Using new Date("YYYY-MM-DD") directly can shift by the server's timezone offset,
// causing the unique index on { teacher, date } to collide on re-runs.
const utcDate = (str) => new Date(`${str}T00:00:00.000Z`);

// DX: Pass --destroy flag to wipe all seeded collections before re-seeding.
// Usage:  npm run seed:fresh
const DESTROY_MODE = process.argv.includes("--destroy");

const seedData = async () => {
  const startTime = Date.now();
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error("❌ MONGO_URI not configured in .env");
      process.exit(1);
    }

    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB. Starting seed...\n");

    // DX: Optional clean wipe before seeding
    if (DESTROY_MODE) {
      console.log("⚠️  --destroy flag detected. Wiping collections...");
      await Promise.all([
        User.deleteMany({}),
        Course.deleteMany({}),
        Attendance.deleteMany({}),
        TeacherAttendance.deleteMany({}),
        Results.deleteMany({}),
        Leave.deleteMany({}),
        Assignment.deleteMany({}),
        Salary.deleteMany({}),
      ]);
      console.log("🗑️  All collections cleared.\n");
    }

    // 1. Create or Find HOD
    const hashedPassword = await hashPassword("password123", 10);
    let hod = await User.findOneAndUpdate(
      { email: "hod@college.edu" },
      {
        name: "Dr. Alice Vance",
        email: "hod@college.edu",
        password: hashedPassword,
        role: "hod",
        phone: "+15550199",
        departmentCode: "CSE",
        isEmailVerified: true
      },
      { upsert: true, new: true }
    );
    console.log("HOD ready: hod@college.edu");

    // 2. Create Teachers
    let teacher1 = await User.findOneAndUpdate(
      { email: "david.evans@college.edu" },
      {
        name: "Dr. David Evans",
        email: "david.evans@college.edu",
        password: hashedPassword,
        role: "teacher",
        phone: "+15550188",
        teacherId: "T-1001",
        department: "Computer Science",
        isEmailVerified: true
      },
      { upsert: true, new: true }
    );
    console.log("Teacher 1 ready: david.evans@college.edu");

    let teacher2 = await User.findOneAndUpdate(
      { email: "sarah.jenkins@college.edu" },
      {
        name: "Prof. Sarah Jenkins",
        email: "sarah.jenkins@college.edu",
        password: hashedPassword,
        role: "teacher",
        phone: "+15550177",
        teacherId: "T-1002",
        department: "Computer Science",
        isEmailVerified: true
      },
      { upsert: true, new: true }
    );
    console.log("Teacher 2 ready: sarah.jenkins@college.edu");

    // 3. Create Students
    let student1 = await User.findOneAndUpdate(
      { email: "alice.johnson@college.edu" },
      {
        name: "Alice Johnson",
        email: "alice.johnson@college.edu",
        password: hashedPassword,
        role: "student",
        phone: "+15550155",
        studentId: "S-2001",
        semester: "3",
        course: "Computer Science",
        isEmailVerified: true
      },
      { upsert: true, new: true }
    );
    console.log("Student 1 ready: alice.johnson@college.edu");

    let student2 = await User.findOneAndUpdate(
      { email: "bob.smith@college.edu" },
      {
        name: "Bob Smith",
        email: "bob.smith@college.edu",
        password: hashedPassword,
        role: "student",
        phone: "+15550144",
        studentId: "S-2002",
        semester: "3",
        course: "Computer Science",
        isEmailVerified: true
      },
      { upsert: true, new: true }
    );
    console.log("Student 2 ready: bob.smith@college.edu");

    // 4. Create Courses
    let course1 = await Course.findOne({ code: "CS-301" });
    if (!course1) {
      course1 = await Course.create({
        name: "Computer Networks",
        code: "CS-301",
        department: "Computer Science",
        semester: 3,
        teacher: teacher1._id
      });
      console.log("Course 1 created: CS-301");
    }

    let course2 = await Course.findOne({ code: "CS-302" });
    if (!course2) {
      course2 = await Course.create({
        name: "Operating Systems",
        code: "CS-302",
        department: "Computer Science",
        semester: 3,
        teacher: teacher2._id
      });
      console.log("Course 2 created: CS-302");
    }

    // 5. Create Student Attendance over last 10 days
    console.log("\nSeeding student attendance...");
    const dates = [
      "2026-05-18", "2026-05-19", "2026-05-20", "2026-05-21", "2026-05-22",
      "2026-05-25", "2026-05-26", "2026-05-27", "2026-05-28", "2026-05-29"
    ];

    for (const d of dates) {
      // Alice: 80% attendance
      const status1 = d === "2026-05-20" || d === "2026-05-27" ? "absent" : "present";
      await Attendance.findOneAndUpdate(
        { student: student1._id, course: course1._id, date: d },
        { status: status1 },
        { upsert: true, runValidators: true }
      );
      await Attendance.findOneAndUpdate(
        { student: student1._id, course: course2._id, date: d },
        { status: status1 },
        { upsert: true, runValidators: true }
      );

      // Bob: 50% attendance (High Risk)
      const status2 = d === "2026-05-19" || d === "2026-05-22" || d === "2026-05-28" || d === "2026-05-20" || d === "2026-05-26" ? "absent" : "present";
      await Attendance.findOneAndUpdate(
        { student: student2._id, course: course1._id, date: d },
        { status: status2 },
        { upsert: true, runValidators: true }
      );
      await Attendance.findOneAndUpdate(
        { student: student2._id, course: course2._id, date: d },
        { status: status2 },
        { upsert: true, runValidators: true }
      );
    }

    // 6. Create Teacher Attendance over last 10 days
    console.log("Seeding teacher attendance...");
    for (const d of dates) {
      // FIX (Bug 3): Use utcDate() to guarantee timezone-safe matching
      // and prevent duplicate-key collisions on re-runs.
      const dateObj = utcDate(d);

      // Teacher 1
      const t1Status = d === "2026-05-21" ? "Late" : d === "2026-05-25" ? "Absent" : "Present";
      await TeacherAttendance.findOneAndUpdate(
        { teacher: teacher1._id, date: dateObj },
        { status: t1Status, markedBy: hod._id },
        { upsert: true, runValidators: true }
      );

      // Teacher 2
      const t2Status = d === "2026-05-27" ? "Absent" : "Present";
      await TeacherAttendance.findOneAndUpdate(
        { teacher: teacher2._id, date: dateObj },
        { status: t2Status, markedBy: hod._id },
        { upsert: true, runValidators: true }
      );
    }

    // 7. Create Student Results
    console.log("Seeding results...");
    // Student 1 (Alice)
    await Results.findOneAndUpdate(
      { studentId: student1._id, courseId: course1._id },
      {
        semester: "3",
        internalMarks: 25,
        externalMarks: 62,
        practicalMarks: 10,
        totalMarks: 97,
        grade: "A+",
        status: "published",
        createdBy: teacher1._id
      },
      { upsert: true, runValidators: true }
    );
    await Results.findOneAndUpdate(
      { studentId: student1._id, courseId: course2._id },
      {
        semester: "3",
        internalMarks: 22,
        externalMarks: 58,
        practicalMarks: 9,
        totalMarks: 89,
        grade: "A",
        status: "published",
        createdBy: teacher2._id
      },
      { upsert: true, runValidators: true }
    );

    // Student 2 (Bob)
    await Results.findOneAndUpdate(
      { studentId: student2._id, courseId: course1._id },
      {
        semester: "3",
        internalMarks: 8,
        externalMarks: 28,
        practicalMarks: 4,
        totalMarks: 40,
        grade: "D",
        status: "published",
        createdBy: teacher1._id
      },
      { upsert: true, runValidators: true }
    );
    await Results.findOneAndUpdate(
      { studentId: student2._id, courseId: course2._id },
      {
        semester: "3",
        internalMarks: 10,
        externalMarks: 30,
        practicalMarks: 5,
        totalMarks: 45,
        grade: "C",
        status: "published",
        createdBy: teacher2._id
      },
      { upsert: true, runValidators: true }
    );

    // 8. Create Assignments and Submissions
    console.log("Seeding assignments and submissions...");
    let assign1 = await Assignment.findOne({ title: "Socket Programming Project" });
    if (!assign1) {
      assign1 = await Assignment.create({
        title: "Socket Programming Project",
        course: course1._id,
        teacher: teacher1._id,
        dueDate: new Date("2026-05-24"),
        submissions: [
          { student: student1._id, submittedAt: new Date("2026-05-22"), marks: 95 },
          { student: student2._id, submittedAt: new Date("2026-05-24"), marks: 82 }
        ]
      });
      console.log("Assignment 1 created");
    }

    let assign2 = await Assignment.findOne({ title: "CPU Scheduler Simulation" });
    if (!assign2) {
      assign2 = await Assignment.create({
        title: "CPU Scheduler Simulation",
        course: course2._id,
        teacher: teacher2._id,
        dueDate: new Date("2026-05-28"),
        submissions: [
          { student: student1._id, submittedAt: new Date("2026-05-27"), marks: 90 },
          { student: student2._id, submittedAt: new Date("2026-05-28"), marks: 75 }
        ]
      });
      console.log("Assignment 2 created");
    }

    // 9. Create Leaves
    console.log("Seeding leaves...");
    // FIX (Bug 1): Added missing required `subject` field to all Leave documents.
    // Without it, Mongoose validation throws and the seed crashes.

    // Student 1 Sick leave
    await Leave.findOneAndUpdate(
      { user: student1._id, reason: "Severe Flu" },
      {
        role: "student",
        subject: "Sick Leave Request – Severe Flu",
        startDate: new Date("2026-05-20"),
        endDate: new Date("2026-05-22"),
        reason: "Severe Flu",
        status: "Approved",
        type: "Sick"
      },
      { upsert: true, runValidators: true }
    );

    // Teacher 1 Duty leave
    await Leave.findOneAndUpdate(
      { user: teacher1._id, reason: "National Conference on AI" },
      {
        role: "teacher",
        subject: "Duty Leave – National Conference on AI",
        startDate: new Date("2026-05-21"),
        endDate: new Date("2026-05-22"),
        reason: "National Conference on AI",
        status: "Approved",
        type: "Duty"
      },
      { upsert: true, runValidators: true }
    );

    // Teacher 2 Pending Sick leave
    await Leave.findOneAndUpdate(
      { user: teacher2._id, reason: "Dental Surgery" },
      {
        role: "teacher",
        subject: "Sick Leave Request – Dental Surgery",
        startDate: new Date("2026-06-05"),
        endDate: new Date("2026-06-06"),
        reason: "Dental Surgery",
        status: "Pending",
        type: "Sick"
      },
      { upsert: true, runValidators: true }
    );

    // 10. Seeding Salaries
    console.log("Seeding salaries...");
    await Salary.findOneAndUpdate(
      { staff: teacher1._id },
      {
        total: 95000,
        paid: 95000,
        dueDate: new Date("2026-05-01"),
        status: "Paid",
        installments: [{ amount: 95000, paidOn: new Date("2026-05-01") }]
      },
      { upsert: true, runValidators: true }
    );

    await Salary.findOneAndUpdate(
      { staff: teacher2._id },
      {
        total: 85000,
        paid: 60000,
        dueDate: new Date("2026-05-01"),
        status: "Partial",
        installments: [{ amount: 60000, paidOn: new Date("2026-05-02") }]
      },
      { upsert: true, runValidators: true }
    );

    // DX: Print a summary table and elapsed time
    console.log("\n📊 Seed Summary:");
    console.table({
      Users:                { seeded: 5 },
      Courses:              { seeded: 2 },
      "Attendance Records": { seeded: dates.length * 4 },
      "Teacher Attendance": { seeded: dates.length * 2 },
      Results:              { seeded: 4 },
      Assignments:          { seeded: 2 },
      Leaves:               { seeded: 3 },
      Salaries:             { seeded: 2 },
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ Seeding complete in ${elapsed}s 🎉`);
    await mongoose.connection.close();
    console.log("🔌 Database connection closed.");
  } catch (error) {
    // FIX (Bug 2): Always close the connection on failure to prevent the
    // Node process from hanging until the socket timeout expires.
    console.error("\n❌ Seeding failed:", error.message);
    await mongoose.connection.close();
    console.error("🔌 Database connection closed after failure.");
    process.exit(1);
  }
};

seedData();
