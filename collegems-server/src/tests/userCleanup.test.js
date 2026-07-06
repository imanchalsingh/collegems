import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import User from '../models/User.model.js';
import TimetableEntry from '../models/TimetableEntry.model.js';
import { getCleanupSuggestions } from '../services/userCleanup.service.js';

let mongoServer;

describe('Inactive User Cleanup Service', () => {
  let activeUser;
  let ghostUser;
  let freshGhostUser;
  let staleUser;
  let archivedTeacherWithEntries;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    const now = Date.now();
    const tenDaysAgo = now - (10 * 24 * 60 * 60 * 1000);
    const twoHundredDaysAgo = now - (200 * 24 * 60 * 60 * 1000);
    const twoDaysAgo = now - (2 * 24 * 60 * 60 * 1000);

    // 1. Perfectly Active User
    activeUser = await User.create({
      name: 'Active Student', email: 'active@test.com', password: 'pwd', role: 'student', course: 'CS101', semester: '1',
      loginCount: 50, lastLogin: new Date(twoDaysAgo), accountStatus: 'active'
    });

    // 2. Ghost User (Created 10 days ago, never logged in)
    ghostUser = new User({
      name: 'Ghost User', email: 'ghost@test.com', password: 'pwd', role: 'student', course: 'CS101', semester: '1',
      loginCount: 0, accountStatus: 'active'
    });
    // Override createdAt for testing
    await ghostUser.save();
    await User.collection.updateOne({ _id: ghostUser._id }, { $set: { createdAt: new Date(tenDaysAgo) } });

    // 3. Fresh Ghost (Created 2 days ago, never logged in) - Should NOT be flagged
    freshGhostUser = new User({
      name: 'Fresh User', email: 'fresh@test.com', password: 'pwd', role: 'student', course: 'CS101', semester: '1',
      loginCount: 0, accountStatus: 'active'
    });
    await freshGhostUser.save();
    await User.collection.updateOne({ _id: freshGhostUser._id }, { $set: { createdAt: new Date(twoDaysAgo) } });

    // 4. Stale User (Logged in 200 days ago)
    staleUser = await User.create({
      name: 'Stale Teacher', email: 'stale@test.com', password: 'pwd', role: 'teacher', department: 'CS',
      loginCount: 5, lastLogin: new Date(twoHundredDaysAgo), accountStatus: 'active'
    });

    // 5. Archived Teacher with Assignments
    archivedTeacherWithEntries = await User.create({
      name: 'Archived Teacher', email: 'archived@test.com', password: 'pwd', role: 'teacher', department: 'CS',
      loginCount: 100, lastLogin: new Date(twoHundredDaysAgo), accountStatus: 'archived'
    });

    // Mock an assignment
    await TimetableEntry.create({
      timetable: new mongoose.Types.ObjectId(),
      timeSlot: new mongoose.Types.ObjectId(),
      room: new mongoose.Types.ObjectId(),
      course: new mongoose.Types.ObjectId(),
      faculty: archivedTeacherWithEntries._id
    });
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('should accurately return ghost, stale, and archived-assigned accounts without false positives', async () => {
    const suggestions = await getCleanupSuggestions(180);

    // activeUser and freshGhostUser should NOT be in the suggestions
    assert.strictEqual(suggestions.length, 3);

    const ghostSuggestion = suggestions.find(s => s.userId.toString() === ghostUser._id.toString());
    assert.ok(ghostSuggestion);
    assert.strictEqual(ghostSuggestion.reason, 'NEVER_LOGGED_IN');

    const staleSuggestion = suggestions.find(s => s.userId.toString() === staleUser._id.toString());
    assert.ok(staleSuggestion);
    assert.strictEqual(staleSuggestion.reason, 'INACTIVE_180_DAYS');

    const archivedSuggestion = suggestions.find(s => s.userId.toString() === archivedTeacherWithEntries._id.toString());
    assert.ok(archivedSuggestion);
    assert.strictEqual(archivedSuggestion.reason, 'ARCHIVED_BUT_ASSIGNED');
    assert.match(archivedSuggestion.details, /1 Timetable Entries/);
  });
});
