import test from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import app from "../app.js";
import User from "../models/User.model.js";
import Alumni from "../models/Alumni.model.js";
import JobPosting from "../models/JobPosting.model.js";
import JobApplication from "../models/JobApplication.model.js";
import jwt from "jsonwebtoken";

test("Alumni Network & Job Board Tests", async (t) => {
  let mongoServer;
  let alumniToken;
  let studentToken;
  let alumniUser;
  let studentUser;
  let jobId;

  t.before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    const jwtSecret = process.env.JWT_SECRET || "testsecret";
    process.env.JWT_SECRET = jwtSecret;

    // Create Alumni User
    alumniUser = await User.create({
      name: "Alumni Pro",
      email: "alumni@test.com",
      password: "password123",
      role: "alumni",
      phone: "1234567890",
    });
    alumniToken = jwt.sign({ id: alumniUser._id, role: alumniUser.role }, jwtSecret);

    // Create Student User with Resume
    studentUser = await User.create({
      name: "Student Candidate",
      email: "student@test.com",
      password: "password123",
      role: "student",
      studentId: "S-101",
      semester: "6",
      course: "CS",
      resumeUrl: "/uploads/resumes/test-resume.pdf"
    });
    studentToken = jwt.sign({ id: studentUser._id, role: studentUser.role }, jwtSecret);
  });

  t.after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  await t.test("PUT /api/alumni/me creates/updates extended alumni profile", async () => {
    const res = await request(app)
      .put("/api/alumni/me")
      .set("Authorization", `Bearer ${alumniToken}`)
      .send({
        batch: "2020",
        department: "Computer Science",
        currentCompany: "Tech Corp",
        designation: "Senior Engineer",
        skills: ["Node.js", "React"]
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.currentCompany, "Tech Corp");
    assert.strictEqual(res.body.data.skills.length, 2);

    // Manually set isVerified so they can post jobs
    await Alumni.updateOne({ userId: alumniUser._id }, { isVerified: true });
  });

  await t.test("GET /api/alumni searches alumni by skills", async () => {
    const res = await request(app)
      .get("/api/alumni?skills=React")
      .set("Authorization", `Bearer ${studentToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.length, 1);
    assert.strictEqual(res.body.data[0].name, "Alumni Pro");
  });

  await t.test("POST /api/jobs allows verified alumni to post jobs", async () => {
    const res = await request(app)
      .post("/api/jobs")
      .set("Authorization", `Bearer ${alumniToken}`)
      .send({
        title: "Frontend Developer",
        company: "Tech Corp",
        type: "Full-time",
        description: "Looking for React dev",
        deadline: new Date(Date.now() + 86400000)
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.title, "Frontend Developer");
    jobId = res.body.data._id;
  });

  await t.test("GET /api/jobs lists active jobs", async () => {
    const res = await request(app)
      .get("/api/jobs")
      .set("Authorization", `Bearer ${studentToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.length, 1);
    assert.strictEqual(res.body.data[0].title, "Frontend Developer");
  });

  await t.test("POST /api/jobs/:jobId/apply allows student to apply", async () => {
    const res = await request(app)
      .post(`/api/jobs/${jobId}/apply`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        coverLetter: "I love React"
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.resumeUrl, "/uploads/resumes/test-resume.pdf");
  });

  await t.test("GET /api/jobs/:jobId/applications allows alumni to view applications", async () => {
    const res = await request(app)
      .get(`/api/jobs/${jobId}/applications`)
      .set("Authorization", `Bearer ${alumniToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.length, 1);
    assert.strictEqual(res.body.data[0].student.name, "Student Candidate");
  });

  await t.test("Edge Case: Unverified alumni cannot post jobs", async () => {
    const unverifiedAlumni = await User.create({
      name: "New Alumni",
      email: "newalumni@test.com",
      password: "password123",
      role: "alumni"
    });
    const unverifiedToken = jwt.sign({ id: unverifiedAlumni._id, role: "alumni" }, process.env.JWT_SECRET);
    
    // Attempt to post
    const res = await request(app)
      .post("/api/jobs")
      .set("Authorization", `Bearer ${unverifiedToken}`)
      .send({
        title: "Backend Dev",
        company: "Startup",
        type: "Full-time",
        description: "Node dev needed",
        deadline: new Date(Date.now() + 86400000)
      });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /Only verified alumni/);
  });

  await t.test("Edge Case: Student cannot apply without a resume", async () => {
    // Create student without resume
    const noResumeStudent = await User.create({
      name: "No Resume Student",
      email: "noresume@test.com",
      password: "password123",
      role: "student",
      studentId: "S-102",
      semester: "5",
      course: "IT"
    });
    const noResumeToken = jwt.sign({ id: noResumeStudent._id, role: "student" }, process.env.JWT_SECRET);

    const res = await request(app)
      .post(`/api/jobs/${jobId}/apply`)
      .set("Authorization", `Bearer ${noResumeToken}`)
      .send({ coverLetter: "Hire me" });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /upload a resume/);
  });

  await t.test("Edge Case: Student cannot apply twice to the same job", async () => {
    const res = await request(app)
      .post(`/api/jobs/${jobId}/apply`)
      .set("Authorization", `Bearer ${studentToken}`) // Already applied in previous test
      .send({ coverLetter: "Hire me again" });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /already applied/);
  });

  await t.test("Edge Case: Unauthorized user cannot view job applications", async () => {
    const res = await request(app)
      .get(`/api/jobs/${jobId}/applications`)
      .set("Authorization", `Bearer ${studentToken}`); // Students can't view applications

    assert.strictEqual(res.status, 403);
    assert.match(res.body.message, /permission/);
  });
});
