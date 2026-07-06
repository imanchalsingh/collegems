import test from 'node:test';
import assert from 'node:assert';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import User from '../models/User.model.js';
import Course from '../models/Course.model.js';
import Attendance from '../models/Attendance.model.js';
import Complaint from '../models/Complaint.model.js';
import Assignment from '../models/Assignment.model.js';
import { getHodDashboardMetrics } from '../controllers/hodAnalytics.controller.js';

let mongoServer;

test('HOD Analytics Controller Tests', async (t) => {
  // 1. Setup
  t.before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  // 2. Teardown
  t.after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Clear data before each test
  t.beforeEach(async () => {
    await User.deleteMany({});
    await Course.deleteMany({});
    await Attendance.deleteMany({});
    await Complaint.deleteMany({});
    await Assignment.deleteMany({});
  });

  await t.test('should calculate dashboard metrics correctly', async () => {
    // Mock req, res
    const req = {
      user: { role: 'hod', department: 'CS' }
    };
    
    let responseData = null;
    const res = {
      status: function (code) { return this; },
      json: function (data) { responseData = data; }
    };

    // Create Data
    // 2 Students in CS, 1 in IT
    const s1 = await User.create({ name: 'S1', email: 's1@test.com', password: 'pwd', role: 'student', department: 'CS', course: 'CS101', semester: '1' });
    const s2 = await User.create({ name: 'S2', email: 's2@test.com', password: 'pwd', role: 'student', department: 'CS', course: 'CS101', semester: '1' });
    await User.create({ name: 'S3', email: 's3@test.com', password: 'pwd', role: 'student', department: 'IT', course: 'IT101', semester: '1' });

    // 1 Teacher in CS, 1 in CS but archived
    const t1 = await User.create({ name: 'T1', email: 't1@test.com', password: 'pwd', role: 'teacher', department: 'CS', accountStatus: 'active' });
    await User.create({ name: 'T2', email: 't2@test.com', password: 'pwd', role: 'teacher', department: 'CS', accountStatus: 'archived' });

    // 2 Courses in CS
    await Course.create({ name: 'CS101', code: 'CS101', department: 'CS', credits: 3, teacher: t1._id, semester: 1 });
    await Course.create({ name: 'CS102', code: 'CS102', department: 'CS', credits: 4, teacher: t1._id, semester: 1 });

    // Attendance: s1 is present, s2 is absent -> 50%
    const c1 = await Course.findOne({ code: 'CS101' });
    await Attendance.create({ student: s1._id, course: c1._id, status: 'present', date: new Date() });
    await Attendance.create({ student: s2._id, course: c1._id, status: 'absent', date: new Date() });

    // Complaints
    await Complaint.create({ title: 'Test Complaint', category: 'Academic', description: 'Desc', department: 'CS', student: s1._id });

    // Assignments
    await Assignment.create({ title: 'Test Assig', teacher: t1._id, dueDate: new Date() });

    // Execute
    await getHodDashboardMetrics(req, res);

    assert.ok(responseData.success);
    const data = responseData.data;

    assert.strictEqual(data.totalEnrollment, 2);
    assert.strictEqual(data.totalCourses, 2);
    assert.strictEqual(data.activeFaculty, 1);
    assert.strictEqual(data.averageAttendance, 50);
    assert.strictEqual(data.recentActivity.length, 2);
    assert.strictEqual(data.recentActivity[0].type, 'Assignment'); // Because it was created last, date is newer
  });

  await t.test('should return 400 if HOD has no department assigned', async () => {
    const req = {
      user: { role: 'hod' } // No department
    };
    let responseStatus = null;
    let responseData = null;
    const res = {
      status: function (code) { responseStatus = code; return this; },
      json: function (data) { responseData = data; }
    };

    await getHodDashboardMetrics(req, res);

    assert.strictEqual(responseStatus, 400);
    assert.strictEqual(responseData.message, 'No department assigned to HOD profile');
  });
});
