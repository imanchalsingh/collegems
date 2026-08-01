import Results from "../models/Results.model.js";
import Student from "../models/User.model.js";
import Course from "../models/Course.model.js";
import { logAction } from "../utils/auditService.js";
import { checkSemesterFrozen } from "../services/semesterService.js";

const MAX_COMPONENT_MARKS = 100;

// A component mark is valid if it's omitted, or a finite number within [0, MAX_COMPONENT_MARKS].
const isValidComponentMark = (marks) =>
    marks === undefined || marks === null ||
    (typeof marks === "number" && Number.isFinite(marks) && marks >= 0 && marks <= MAX_COMPONENT_MARKS);

export const getResults = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                message: "User not authenticated",
            });
        }

        let studentId = req.user.id;
        if (req.user.role === "parent") {
            const User = (await import("../models/User.model.js")).default;
            const parentUser = await User.findById(req.user.id);
            if (!parentUser || !parentUser.studentId) {
                return res.status(400).json({ message: "No child linked to this parent account" });
            }
            const studentUser = await User.findOne({ studentId: parentUser.studentId, role: "student" });
            if (!studentUser) {
                return res.status(404).json({ message: "Linked student not found" });
            }
            studentId = studentUser._id;
        }

        const results = await Results.find({
            studentId: studentId,
            status: "published",
        })
            .populate("courseId", "name code credits")
            .select("internalMarks externalMarks practicalMarks totalMarks grade status semester createdAt");

        res.json(results);
    } catch (error) {
        console.error("Get Results Error:", error);
        res.status(500).json({
            message: "Failed to fetch results",
        });
    }
};

export const createResult = async (req, res) => {
    try {
        const {
            studentId,
            courseId,
            semester,
            internalMarks,
            externalMarks,
            practicalMarks,
            grade,
            status,
        } = req.body;

        if (![internalMarks, externalMarks, practicalMarks].every(isValidComponentMark)) {
            return res.status(400).json({
                message: `Marks fields must be numbers between 0 and ${MAX_COMPONENT_MARKS}`,
            });
        }

        const totalMarks = (internalMarks || 0) + (externalMarks || 0) + (practicalMarks || 0);

        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        if (student.role !== "student") {
            return res.status(400).json({ message: "Specified user is not a student" });
        }

        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }

        // Verify course ownership if user is a teacher
        if (req.user.role === "teacher" && course.teacher.toString() !== req.user.id) {
            return res.status(403).json({
                message: "Not authorized to manage results for this course",
            });
        }

        // Verify student eligibility for the course
        const matchesSem = student.semester && course.semester === Number(student.semester);
        const matchesDept = student.course && course.department.toLowerCase() === student.course.toLowerCase();
        if (!matchesSem && !matchesDept) {
            return res.status(403).json({
                message: "Not authorized to grade this student (student is not in the course's department or semester)",
            });
        }

        const effectiveSemester = semester || student.semester;
        await checkSemesterFrozen(effectiveSemester);

        const result = await Results.create({
            studentId,
            courseId,
            semester: effectiveSemester,
            internalMarks,
            externalMarks,
            practicalMarks,
            totalMarks,
            grade,
            status: status || "draft",
            createdBy: req.user.id,
        });

        // Log result creation with rich audit details
        await logAction(req.user.id, "CREATE_RESULT", "Result", result._id, {
            userRole: req.user.role,
            studentId,
            previousValue: null,
            newValue: {
                studentId,
                courseId,
                semester: effectiveSemester,
                internalMarks,
                externalMarks,
                practicalMarks,
                totalMarks,
                grade,
                status: result.status,
            },
        });

        res.status(201).json(result);
    } catch (err) {
        console.log("Create Result Error:", err);
        if (err.status === 403) return res.status(403).json({ message: err.message });
        res.status(500).json({ message: "Server Error" });
    }
};

export const publishResult = async (req, res) => {
    try {
        const result = await Results.findById(req.params.id);
        if (!result) {
            return res.status(404).json({ message: "Result record not found" });
        }

        await checkSemesterFrozen(result.semester);

        const previousValue = { status: result.status };
        result.status = "published";
        await result.save();

        // Log result publish with rich audit details
        await logAction(req.user.id, "PUBLISH_RESULT", "Result", result._id, {
            userRole: req.user.role,
            studentId: result.studentId,
            previousValue,
            newValue: { status: "published" },
        });

        res.json(result);
    } catch (error) {
        if (error.status === 403) return res.status(403).json({ message: error.message });
        console.error("Publish Result Error:", error);
        if (error.name === "ValidationError") {
            return res.status(400).json({ message: "Cannot publish a result with invalid marks", error: error.message });
        }
        res.status(500).json({ message: "Publish failed" });
    }
};

// Preview which draft results would be published for a given course/semester,
// without changing anything. Lets a HOD review before committing to publishAll.
export const publishPreview = async (req, res) => {
    try {
        const { courseId, semester } = req.query;

        const filter = { status: "draft" };
        if (courseId) filter.courseId = courseId;
        if (semester) filter.semester = semester;

        const drafts = await Results.find(filter)
            .populate("studentId", "name email studentId")
            .populate("courseId", "name code");

        res.json({
            success: true,
            count: drafts.length,
            data: drafts,
        });
    } catch (error) {
        console.error("Publish Preview Error:", error);
        res.status(500).json({ message: "Failed to load publish preview" });
    }
};

// Bulk-publishes every draft result matching the given course/semester filter.
// Mirrors publishResult's single-record behaviour, but for many records at once.
export const publishAll = async (req, res) => {
    try {
        const { courseId, semester } = req.body;

        const filter = { status: "draft" };
        if (courseId) filter.courseId = courseId;
        if (semester) filter.semester = semester;

        const drafts = await Results.find(filter);

        if (drafts.length === 0) {
            return res.json({ success: true, message: "No draft results to publish", count: 0 });
        }

        const affectedSemesters = [...new Set(drafts.map((r) => r.semester))];
        for (const sem of affectedSemesters) {
            await checkSemesterFrozen(sem);
        }

        await Results.updateMany(filter, { $set: { status: "published" } });

        if (publishable.length === 0) {
            return res.json({ success: true, message: "No draft results with valid marks to publish", count: 0, skipped });
        }

        await Results.updateMany(
            { _id: { $in: publishable.map((d) => d._id) } },
            { $set: { status: "published" } }
        );

        // Log bulk publish with rich audit details
        await logAction(req.user.id, "PUBLISH_ALL_RESULTS", "Result", null, {
            userRole: req.user.role,
            filter: { courseId: courseId || null, semester: semester || null },
            publishedCount: publishable.length,
            resultIds: publishable.map((r) => r._id),
        });

        res.json({
            success: true,
            message: `Published ${drafts.length} result(s)`,
            count: drafts.length,
        });
    } catch (error) {
        if (error.status === 403) return res.status(403).json({ message: error.message });
        console.error("Publish All Error:", error);
        res.status(500).json({ message: "Bulk publish failed" });
    }
};
