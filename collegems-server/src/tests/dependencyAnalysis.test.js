import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import Course from '../models/Course.model.js';
import User from '../models/User.model.js';
import TimetableEntry from '../models/TimetableEntry.model.js';
import Syllabus from '../models/Syllabus.model.js';
import { calculateImpact } from '../services/dependencyAnalysis.service.js';

let mongoServer;

describe('Record Dependency Warning Service', () => {
  let courseWithDependencies;
  let emptyCourse;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    const teacher = await User.create({
      name: 'Dr. Jones', email: 'jones@test.com', password: 'pwd', role: 'teacher', department: 'CS'
    });

    courseWithDependencies = await Course.create({
      name: 'Data Structures', code: 'CS201', department: 'CS', semester: 2, teacher: teacher._id
    });

    emptyCourse = await Course.create({
      name: 'Empty Course', code: 'EC101', department: 'CS', semester: 1, teacher: teacher._id
    });

    // Create 3 enrolled students
    for (let i = 0; i < 3; i++) {
      await User.create({
        name: `Student ${i}`, email: `student${i}@test.com`, password: 'pwd', role: 'student',
        course: courseWithDependencies.name, semester: 2
      });
    }

    // Create 2 timetable entries
    for (let i = 0; i < 2; i++) {
      await TimetableEntry.create({
        timetable: new mongoose.Types.ObjectId(),
        timeSlot: new mongoose.Types.ObjectId(),
        room: new mongoose.Types.ObjectId(),
        course: courseWithDependencies._id,
        faculty: teacher._id
      });
    }
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('should return zero dependencies for an isolated course', async () => {
    const result = await calculateImpact('Course', emptyCourse._id);
    
    assert.strictEqual(result.hasDependencies, false);
    assert.strictEqual(result.totalImpact, 0);
    assert.strictEqual(result.summary.length, 0);
  });

  it('should detect students and timetable entries dependent on a course', async () => {
    const result = await calculateImpact('Course', courseWithDependencies._id);
    
    assert.strictEqual(result.hasDependencies, true);
    assert.strictEqual(result.totalImpact, 5); // 3 students + 2 entries
    
    const studentsSummary = result.summary.find(s => s.type === 'Enrolled Students');
    const timetableSummary = result.summary.find(s => s.type === 'Timetable Entries');
    
    assert.ok(studentsSummary);
    assert.strictEqual(studentsSummary.count, 3);
    
    assert.ok(timetableSummary);
    assert.strictEqual(timetableSummary.count, 2);
  });
});
