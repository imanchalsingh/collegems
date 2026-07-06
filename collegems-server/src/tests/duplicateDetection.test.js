import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { checkPotentialDuplicates } from "../services/duplicateDetection.service.js";
import User from "../models/User.model.js";

let mongoServer;

describe("Interactive Duplicate Detection Service Tests", () => {
  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    // Create seed users
    await User.create([
      {
        name: "John Doe",
        email: "john@example.com",
        studentId: "STU001",
        phone: "555-1234",
        dob: new Date("2000-01-01"),
        role: "student",
        password: "hashedpassword",
        course: new mongoose.Types.ObjectId(),
        semester: "1"
      },
      {
        name: "Jane Smith",
        email: "jane@example.com",
        studentId: "STU002",
        phone: "555-9999",
        dob: new Date("1999-05-15"),
        role: "student",
        password: "hashedpassword",
        course: new mongoose.Types.ObjectId(),
        semester: "2"
      }
    ]);
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("should return empty array when no matches exist", async () => {
    const payload = {
      name: "Alice Johnson",
      email: "alice@example.com",
      studentId: "STU003",
      phone: "555-0000",
      dob: "2001-02-02"
    };
    
    const duplicates = await checkPotentialDuplicates(payload);
    assert.strictEqual(duplicates.length, 0);
  });

  it("should detect an email duplicate", async () => {
    const payload = {
      name: "John Duplicate",
      email: "john@example.com",
      studentId: "STU999"
    };
    
    const duplicates = await checkPotentialDuplicates(payload);
    assert.strictEqual(duplicates.length, 1);
    assert.strictEqual(duplicates[0].matchReason, "Email");
  });

  it("should detect a Name + DOB duplicate even if email is different", async () => {
    const payload = {
      name: "Jane Smith",
      email: "jane.new@example.com",
      dob: "1999-05-15"
    };
    
    const duplicates = await checkPotentialDuplicates(payload);
    assert.strictEqual(duplicates.length, 1);
    assert.ok(duplicates[0].matchReason.includes("Name"));
  });

  it("should detect a Phone number duplicate", async () => {
    const payload = {
      name: "Different Person",
      email: "different@example.com",
      phone: "555-1234"
    };
    
    const duplicates = await checkPotentialDuplicates(payload);
    assert.strictEqual(duplicates.length, 1);
    assert.strictEqual(duplicates[0].matchReason, "Phone");
  });

  it("should return multiple reasons if multiple fields match", async () => {
    const payload = {
      name: "John Doe",
      email: "john@example.com",
      studentId: "STU001",
      phone: "555-1234",
      dob: "2000-01-01"
    };
    
    const duplicates = await checkPotentialDuplicates(payload);
    assert.strictEqual(duplicates.length, 1);
    assert.ok(duplicates[0].matchReason.includes("Email"));
    assert.ok(duplicates[0].matchReason.includes("Student ID"));
    assert.ok(duplicates[0].matchReason.includes("Phone"));
    assert.ok(duplicates[0].matchReason.includes("Name"));
  });
});
