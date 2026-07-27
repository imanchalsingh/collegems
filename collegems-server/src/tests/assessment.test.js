import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import Course from '../models/Course.model.js';
import AssessmentConfig from '../models/AssessmentConfig.model.js';
import InternalAssessment from '../models/InternalAssessment.model.js';
import { saveInternalAssessment } from '../controllers/assessment.controller.js';

let mongoServer;

function mockRes() {
    const res = {};
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (payload) => { res.body = payload; return res; };
    return res;
}

describe('Internal Assessment Score Validation', () => {
    let courseId;
    let studentId;

    before(async () => {
        mongoServer = await MongoMemoryServer.create();
        await mongoose.connect(mongoServer.getUri());
    });

    after(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    beforeEach(async () => {
        courseId = new mongoose.Types.ObjectId();
        studentId = new mongoose.Types.ObjectId();

        await Course.deleteMany({});
        await AssessmentConfig.deleteMany({});
        await InternalAssessment.deleteMany({});

        await Course.create({
            _id: courseId,
            name: "Test Course",
            code: "TEST101",
            department: "Computer Science",
            semester: 1,
            teacher: new mongoose.Types.ObjectId(),
        });

        await AssessmentConfig.create({
            courseId,
            components: [
                { name: 'Assignment', weightage: 20, maxMarks: 20 },
                { name: 'Midterm', weightage: 80, maxMarks: 50 }
            ]
        });
    });

    it('rejects a score greater than the component maxMarks', async () => {
        const req = { 
            params: { courseId: String(courseId), studentId: String(studentId) }, 
            body: { scores: [{ componentName: 'Assignment', score: 5000 }] },
            user: { role: 'admin' }
        };
        const res = mockRes();

        await saveInternalAssessment(req, res);

        assert.strictEqual(res.statusCode, 400);
        const saved = await InternalAssessment.findOne({ courseId, studentId });
        assert.strictEqual(saved, null);
    });

    it('rejects an unknown component name', async () => {
        const req = { 
            params: { courseId: String(courseId), studentId: String(studentId) }, 
            body: { scores: [{ componentName: 'Bogus', score: 5 }] },
            user: { role: 'admin' }
        };
        const res = mockRes();

        await saveInternalAssessment(req, res);

        assert.strictEqual(res.statusCode, 400);
    });

    it('accepts valid scores and computes the weighted total', async () => {
        const req = {
            params: { courseId: String(courseId), studentId: String(studentId) },
            body: { scores: [{ componentName: 'Assignment', score: 10 }, { componentName: 'Midterm', score: 25 }] },
            user: { role: 'admin' }
        };
        const res = mockRes();

        await saveInternalAssessment(req, res);

        assert.strictEqual(res.statusCode, 200);
        const expected = (10 / 20) * 20 + (25 / 50) * 80;
        assert.strictEqual(res.body.assessment.totalInternalMarks, expected);
    });
});
