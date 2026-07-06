import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import TimetableEntry from '../models/TimetableEntry.model.js';
import User from '../models/User.model.js';
import Room from '../models/Room.model.js';
import Course from '../models/Course.model.js';
import { checkConflicts } from '../services/scheduleValidation.service.js';

let mongoServer;

describe('Schedule Validation Service', () => {
  let timetableId;
  let timeSlotId;
  let faculty1Id;
  let faculty2Id;
  let room1Id;
  let room2Id;
  let course1Id;
  let course2Id;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    timetableId = new mongoose.Types.ObjectId();
    timeSlotId = new mongoose.Types.ObjectId();

    // Create Mock Data
    const faculty1 = await User.create({ name: 'Dr. Smith', email: 'smith@test.com', password: 'pwd', role: 'teacher', department: 'CS' });
    const faculty2 = await User.create({ name: 'Dr. Jones', email: 'jones@test.com', password: 'pwd', role: 'teacher', department: 'CS' });
    const room1 = await Room.create({ name: 'Lecture Hall 1', roomNumber: '101', capacity: 30, building: 'A' });
    const room2 = await Room.create({ name: 'Lecture Hall 2', roomNumber: '102', capacity: 30, building: 'A' });
    const course1 = await Course.create({ name: 'Physics 101', code: 'PHY101', credits: 3, department: 'CS', teacher: faculty1._id, semester: 1 });
    const course2 = await Course.create({ name: 'Math 101', code: 'MAT101', credits: 3, department: 'CS', teacher: faculty2._id, semester: 1 });

    faculty1Id = faculty1._id;
    faculty2Id = faculty2._id;
    room1Id = room1._id;
    room2Id = room2._id;
    course1Id = course1._id;
    course2Id = course2._id;

    // Create an existing entry taking up Faculty 1, Room 1, and Course 1 at TimeSlot 1
    await TimetableEntry.create({
      timetable: timetableId,
      timeSlot: timeSlotId,
      faculty: faculty1Id,
      room: room1Id,
      course: course1Id
    });
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('should detect no conflicts for a completely free timeslot', async () => {
    const result = await checkConflicts({
      timetableId,
      timeSlotId,
      facultyId: faculty2Id,
      roomId: room2Id,
      courseId: course2Id
    });
    
    assert.strictEqual(result.hasConflicts, false);
    assert.strictEqual(result.conflicts.length, 0);
  });

  it('should detect a faculty conflict', async () => {
    const result = await checkConflicts({
      timetableId,
      timeSlotId,
      facultyId: faculty1Id, // Dr. Smith is already busy
      roomId: room2Id,
      courseId: course2Id
    });
    
    assert.strictEqual(result.hasConflicts, true);
    assert.strictEqual(result.conflicts[0].type, 'FACULTY');
    assert.match(result.conflicts[0].message, /Dr. Smith is already scheduled to teach Physics 101/);
  });

  it('should detect a room conflict', async () => {
    const result = await checkConflicts({
      timetableId,
      timeSlotId,
      facultyId: faculty2Id,
      roomId: room1Id, // Lecture Hall 1 is already booked
      courseId: course2Id
    });
    
    assert.strictEqual(result.hasConflicts, true);
    assert.strictEqual(result.conflicts[0].type, 'ROOM');
    assert.match(result.conflicts[0].message, /Lecture Hall 1 is already booked/);
  });

  it('should detect a course/section conflict', async () => {
    const result = await checkConflicts({
      timetableId,
      timeSlotId,
      facultyId: faculty2Id,
      roomId: room2Id,
      courseId: course1Id // Physics 101 section is already in class
    });
    
    assert.strictEqual(result.hasConflicts, true);
    assert.strictEqual(result.conflicts[0].type, 'SECTION');
  });

  it('should ignore conflicts with itself during an update', async () => {
    const entry = await TimetableEntry.findOne({ faculty: faculty1Id });
    
    const result = await checkConflicts({
      timetableId,
      timeSlotId,
      facultyId: faculty1Id,
      roomId: room1Id,
      courseId: course1Id,
      excludeEntryId: entry._id // Exclude self
    });
    
    assert.strictEqual(result.hasConflicts, false);
  });
});
