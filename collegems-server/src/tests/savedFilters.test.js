import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import User from "../models/User.model.js";
import SavedFilter from "../models/SavedFilter.model.js";
import * as savedFilterController from "../controllers/savedFilter.controller.js";

// Mock req and res
const mockReq = (options = {}) => ({
  params: {},
  body: {},
  user: {},
  ...options,
});

const mockRes = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.body = data;
    return res;
  };
  return res;
};

describe("Saved Filters API Tests", () => {
  let mongoServer;
  let user1, user2;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    user1 = await User.create({
      name: "User One",
      email: "user1@filters.test.com",
      password: "password123",
      role: "hod",
      department: "Computer Science",
    });

    user2 = await User.create({
      name: "User Two",
      email: "user2@filters.test.com",
      password: "password123",
      role: "teacher",
      department: "Computer Science",
    });
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await SavedFilter.deleteMany({});
  });

  it("should create a new saved filter", async () => {
    const req = mockReq({
      user: user1,
      body: {
        name: "Active CS Teachers",
        dashboard: "HODTeachers",
        filters: { searchTerm: "Smith", filterDepartment: "Computer Science" },
      },
    });
    const res = mockRes();

    await savedFilterController.createSavedFilter(req, res);

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.name, "Active CS Teachers");
    assert.strictEqual(res.body.data.filters.searchTerm, "Smith");
  });

  it("should overwrite an existing filter with the same name on the same dashboard", async () => {
    // First save
    const req1 = mockReq({
      user: user1,
      body: {
        name: "My Filter",
        dashboard: "HODTeachers",
        filters: { searchTerm: "old" },
      },
    });
    const res1 = mockRes();
    await savedFilterController.createSavedFilter(req1, res1);

    // Overwrite
    const req2 = mockReq({
      user: user1,
      body: {
        name: "My Filter",
        dashboard: "HODTeachers",
        filters: { searchTerm: "new" },
      },
    });
    const res2 = mockRes();
    await savedFilterController.createSavedFilter(req2, res2);

    assert.strictEqual(res2.statusCode, 200); // 200 for update
    assert.strictEqual(res2.body.data.filters.searchTerm, "new");
    assert.strictEqual(res2.body.message, "Saved filter updated");

    const count = await SavedFilter.countDocuments({ user: user1._id, dashboard: "HODTeachers", name: "My Filter" });
    assert.strictEqual(count, 1);
  });

  it("should retrieve filters only for the authenticated user and specified dashboard", async () => {
    await SavedFilter.create([
      { user: user1._id, name: "U1 Filter 1", dashboard: "HODTeachers", filters: {} },
      { user: user1._id, name: "U1 Filter 2", dashboard: "HODCourses", filters: {} },
      { user: user2._id, name: "U2 Filter 1", dashboard: "HODTeachers", filters: {} },
    ]);

    const req = mockReq({
      user: user1,
      params: { dashboard: "HODTeachers" },
    });
    const res = mockRes();

    await savedFilterController.getSavedFilters(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.count, 1);
    assert.strictEqual(res.body.data[0].name, "U1 Filter 1");
  });

  it("should delete a saved filter", async () => {
    const filter = await SavedFilter.create({
      user: user1._id,
      name: "To Delete",
      dashboard: "HODTeachers",
      filters: {},
    });

    const req = mockReq({
      user: user1,
      params: { id: filter._id.toString() },
    });
    const res = mockRes();

    await savedFilterController.deleteSavedFilter(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.message, "Saved filter deleted");

    const count = await SavedFilter.countDocuments();
    assert.strictEqual(count, 0);
  });

  it("should prevent a user from deleting another user's filter", async () => {
    const filter = await SavedFilter.create({
      user: user1._id,
      name: "U1 Filter",
      dashboard: "HODTeachers",
      filters: {},
    });

    const req = mockReq({
      user: user2, // user2 attempting to delete user1's filter
      params: { id: filter._id.toString() },
    });
    const res = mockRes();

    await savedFilterController.deleteSavedFilter(req, res);

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.message, "Not authorized to delete this filter");

    const count = await SavedFilter.countDocuments();
    assert.strictEqual(count, 1); // Not deleted
  });
});
