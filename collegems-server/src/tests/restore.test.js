import test from 'node:test';
import assert from 'node:assert';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import User from '../models/User.model.js';
import HallAllocation from '../models/HallAllocation.model.js';
import * as restoreService from '../services/restore.service.js';

let mongoServer;

test('Restore Service Tests', async (t) => {
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
    try {
      await User.collection.dropIndex('email_1');
    } catch (e) {
      // ignore
    }
  });

  await t.test('should return supported models', async () => {
    const models = restoreService.getSupportedModels();
    assert.ok(models.includes('User'));
    assert.ok(models.includes('HallAllocation'));
  });

  await t.test('should get archived records', async () => {
    await User.create([
      { name: 'Active User', email: 'active@test.com', password: 'pwd', role: 'student', accountStatus: 'active', course: 'CS', semester: '1' },
      { name: 'Archived User 1', email: 'archived1@test.com', password: 'pwd', role: 'student', accountStatus: 'archived', course: 'CS', semester: '1' },
      { name: 'Archived User 2', email: 'archived2@test.com', password: 'pwd', role: 'teacher', accountStatus: 'archived', department: 'CS' }
    ]);

    const result = await restoreService.getArchivedRecords('User');
    assert.strictEqual(result.total, 2);
    assert.strictEqual(result.records.length, 2);
  });

  await t.test('should get archived record details', async () => {
    const user = await User.create({
      name: 'Archived User',
      email: 'details@test.com',
      password: 'pwd',
      role: 'student',
      accountStatus: 'archived',
      course: 'CS',
      semester: '1'
    });

    const record = await restoreService.getArchivedRecordDetails('User', user._id);
    assert.strictEqual(record.name, 'Archived User');
  });

  await t.test('should validate eligibility - eligible', async () => {
    const user = await User.create({
      name: 'Archived User',
      email: 'eligible@test.com',
      password: 'pwd',
      role: 'student',
      accountStatus: 'archived',
      course: 'CS',
      semester: '1'
    });

    const result = await restoreService.validateRestorationEligibility('User', user._id);
    assert.strictEqual(result.eligible, true);
  });

  await t.test('should validate eligibility - conflict', async () => {
    await User.create({
      name: 'Active User',
      email: 'conflict@test.com',
      password: 'pwd',
      role: 'student',
      accountStatus: 'active',
      course: 'CS',
      semester: '1'
    });

    const archivedUser = await User.create({
      name: 'Archived User',
      email: 'conflict@test.com', // Duplicate email
      password: 'pwd',
      role: 'student',
      accountStatus: 'archived',
      course: 'CS',
      semester: '1'
    });

    const result = await restoreService.validateRestorationEligibility('User', archivedUser._id);
    assert.strictEqual(result.eligible, false);
    assert.ok(result.reason.includes('Conflict'));
  });

  await t.test('should restore record', async () => {
    const user = await User.create({
      name: 'Archived User',
      email: 'restore@test.com',
      password: 'pwd',
      role: 'student',
      accountStatus: 'archived',
      course: 'CS',
      semester: '1'
    });

    const adminId = new mongoose.Types.ObjectId();
    const restored = await restoreService.restoreRecord('User', user._id, adminId);
    
    assert.strictEqual(restored.accountStatus, 'active');
    
    const fetched = await User.findById(user._id);
    assert.strictEqual(fetched.accountStatus, 'active');
  });

  await t.test('should fail to restore if conflict', async () => {
    await User.create({
      name: 'Active User',
      email: 'failrestore@test.com',
      password: 'pwd',
      role: 'student',
      accountStatus: 'active',
      course: 'CS',
      semester: '1'
    });

    const archivedUser = await User.create({
      name: 'Archived User',
      email: 'failrestore@test.com', // Duplicate email
      password: 'pwd',
      role: 'student',
      accountStatus: 'archived',
      course: 'CS',
      semester: '1'
    });

    const adminId = new mongoose.Types.ObjectId();
    await assert.rejects(
      restoreService.restoreRecord('User', archivedUser._id, adminId),
      /Conflict/
    );
  });
  await t.test('should throw error for unsupported model', async () => {
    await assert.rejects(
      restoreService.getArchivedRecords('InvalidModel'),
      /does not support restoration or is not configured/
    );
  });

  await t.test('should throw error if record not found', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    await assert.rejects(
      restoreService.getArchivedRecordDetails('User', fakeId),
      /Record not found/
    );
  });

  await t.test('should throw error if record is not archived', async () => {
    const user = await User.create({
      name: 'Active User 2',
      email: 'notarchived@test.com',
      password: 'pwd',
      role: 'student',
      accountStatus: 'active',
      course: 'CS',
      semester: '1'
    });

    await assert.rejects(
      restoreService.validateRestorationEligibility('User', user._id),
      /Record is not archived/
    );
  });

  await t.test('should restore HallAllocation properly with different state mapping', async () => {
    const HallAllocation = mongoose.model('HallAllocation');
    // Clear HallAllocations before test
    await HallAllocation.deleteMany({});
    
    const adminId = new mongoose.Types.ObjectId();
    const examScheduleId = new mongoose.Types.ObjectId();
    
    const allocation = await HallAllocation.create({
      examSchedule: examScheduleId,
      allocatedBy: adminId,
      status: 'archived',
      totalStudents: 10,
      totalHalls: 1
    });

    const restored = await restoreService.restoreRecord('HallAllocation', allocation._id, adminId);
    
    assert.strictEqual(restored.status, 'draft');
    assert.strictEqual(restored.restoredBy.toString(), adminId.toString());
  });
});
