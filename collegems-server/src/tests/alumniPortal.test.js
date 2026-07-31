import test from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app.js";
import User from "../models/User.model.js";
import Alumni from "../models/Alumni.model.js";
import Mentorship from "../models/Mentorship.model.js";
import AlumniDonation from "../models/AlumniDonation.model.js";

test("Alumni Portal donations & mentorship requests", async (t) => {
  let mongoServer;
  let alumniToken;
  let studentToken;
  let alumniUser;
  let studentUser;
  let alumniProfile;

  t.before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    const jwtSecret = process.env.JWT_SECRET || "testsecret";
    process.env.JWT_SECRET = jwtSecret;
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;

    alumniUser = await User.create({
      name: "Alumni Donor",
      email: "alumni.donor@test.com",
      password: "password123",
      role: "alumni",
      phone: "9999999999",
    });
    alumniToken = jwt.sign(
      { id: alumniUser._id, role: alumniUser.role },
      jwtSecret
    );

    studentUser = await User.create({
      name: "Student Seeker",
      email: "student.seeker@test.com",
      password: "password123",
      role: "student",
      studentId: "S-777",
      semester: "6",
      course: "CS",
    });
    studentToken = jwt.sign(
      { id: studentUser._id, role: studentUser.role },
      jwtSecret
    );

    alumniProfile = await Alumni.create({
      name: alumniUser.name,
      email: alumniUser.email,
      batch: "2018",
      department: "Computer Science",
      currentCompany: "Acme Corp",
      industry: "Technology",
      location: "Mumbai",
      openToMentorship: true,
      isVerified: true,
      userId: alumniUser._id,
    });
  });

  t.after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  await t.test("GET /api/alumni filters by industry and location", async () => {
    const res = await request(app)
      .get("/api/alumni?industry=Technology&location=Mumbai")
      .set("Authorization", `Bearer ${studentToken}`);

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.data.length >= 1);
    assert.strictEqual(res.body.data[0].currentCompany, "Acme Corp");
  });

  await t.test(
    "POST /api/alumni/:id/mentorship-request creates pending mentorship",
    async () => {
      const res = await request(app)
        .post(`/api/alumni/${alumniProfile._id}/mentorship-request`)
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ note: "Need career guidance" });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.data.status, "pending");

      const mentorship = await Mentorship.findById(res.body.data._id);
      assert.ok(mentorship);
      assert.strictEqual(mentorship.source, "alumni_request");
    }
  );

  await t.test(
    "POST /api/alumni/donations/checkout uses demo provider without Razorpay keys",
    async () => {
      const checkout = await request(app)
        .post("/api/alumni/donations/checkout")
        .set("Authorization", `Bearer ${alumniToken}`)
        .send({
          amount: 250,
          fund: "scholarship",
          message: "Supporting juniors",
        });

      assert.strictEqual(checkout.status, 201);
      assert.strictEqual(checkout.body.data.provider, "demo");

      const confirm = await request(app)
        .post("/api/alumni/donations/confirm")
        .set("Authorization", `Bearer ${alumniToken}`)
        .send({ donationId: checkout.body.data.donationId });

      assert.strictEqual(confirm.status, 200);
      assert.strictEqual(confirm.body.data.status, "paid");

      const donation = await AlumniDonation.findById(
        checkout.body.data.donationId
      );
      assert.strictEqual(donation.status, "paid");
      assert.strictEqual(donation.amount, 250);
    }
  );
});
