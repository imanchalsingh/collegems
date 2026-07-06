import test from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { getPaginatedData } from "../utils/pagination.util.js";
import User from "../models/User.model.js";

let mongoServer;

test("Pagination Utility", async (t) => {
  await t.test("Setup", async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  await t.test("Seed Database", async () => {
    const students = [
      { name: "Alice", email: "alice@test.com", role: "student", studentId: "S001", course: "BCA", semester: 1 },
      { name: "Bob", email: "bob@test.com", role: "student", studentId: "S002", course: "BBA", semester: 1 },
      { name: "Charlie", email: "charlie@test.com", role: "student", studentId: "S003", course: "BCA", semester: 2 },
      { name: "Diana", email: "diana@test.com", role: "student", studentId: "S004", course: "MCA", semester: 3 },
      { name: "Eve", email: "eve@test.com", role: "student", studentId: "S005", course: "BCA", semester: 1 },
    ];
    await User.insertMany(students.map(s => ({ ...s, password: "pw" })));
  });

  await t.test("Basic Pagination", async () => {
    const query = { page: "1", limit: "2" };
    const result = await getPaginatedData(User, query, {
      baseFilter: { role: "student" },
      defaultSort: { name: 1 }
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data.length, 2);
    assert.strictEqual(result.meta.totalRecords, 5);
    assert.strictEqual(result.meta.totalPages, 3);
    assert.strictEqual(result.meta.hasNextPage, true);
    assert.strictEqual(result.meta.hasPrevPage, false);
    assert.strictEqual(result.data[0].name, "Alice"); // Sorted by name asc by default
    assert.strictEqual(result.data[1].name, "Bob");
  });

  await t.test("Filtering", async () => {
    const query = { filter: { course: "BCA" } };
    const result = await getPaginatedData(User, query, {
      baseFilter: { role: "student" },
      defaultSort: { name: 1 }
    });

    assert.strictEqual(result.meta.totalRecords, 3);
    assert.strictEqual(result.data.length, 3);
    assert.ok(result.data.every(s => s.course === "BCA"));
  });

  await t.test("Searching", async () => {
    const query = { search: "ali" };
    const result = await getPaginatedData(User, query, {
      baseFilter: { role: "student" },
      searchFields: ["name", "email"]
    });

    assert.strictEqual(result.meta.totalRecords, 1);
    assert.strictEqual(result.data[0].name, "Alice");
  });

  await t.test("Sorting", async () => {
    const query = { sortBy: "name", sortOrder: "desc", limit: "2" };
    const result = await getPaginatedData(User, query, {
      baseFilter: { role: "student" },
    });

    assert.strictEqual(result.data[0].name, "Eve");
    assert.strictEqual(result.data[1].name, "Diana");
  });

  await t.test("Custom defaultLimit option", async () => {
    // When no ?limit param is supplied, the defaultLimit option should be respected
    const result = await getPaginatedData(User, {}, {
      baseFilter: { role: "student" },
      defaultLimit: 20,
    });

    // We only seeded 5 students, so all 5 are returned in one page
    assert.strictEqual(result.meta.limit, 20);
    assert.strictEqual(result.meta.totalRecords, 5);
    assert.strictEqual(result.meta.totalPages, 1);
  });

  await t.test("Teardown", async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });
});
