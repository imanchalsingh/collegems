import ExaminationForm from "../models/ExaminationForm.model.js";
import { evaluateEligibility } from "../services/eligibilityEngine.js";

// @desc    Submit a new examination form
// @route   POST /api/exam-forms
// @access  Private (Student only)
export const submitExamForm = async (req, res) => {
  try {
    const { studentName, rollNumber, courseDept, semesterYear, subjects, examType } = req.body;
    const studentId = req.user.id;

    // Validation
    if (!studentName || !studentName.trim()) {
      return res.status(400).json({ message: "Student Name is required" });
    }
    if (!rollNumber || !rollNumber.trim()) {
      return res.status(400).json({ message: "Roll Number is required" });
    }
    if (!courseDept || !courseDept.trim()) {
      return res.status(400).json({ message: "Course/Department is required" });
    }
    if (!semesterYear || !semesterYear.trim()) {
      return res.status(400).json({ message: "Semester/Year is required" });
    }
    if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({ message: "At least one subject must be selected" });
    }
    const validExamTypes = ["Regular", "Backlog", "Improvement", "Re-evaluation"];
    if (!examType || !validExamTypes.includes(examType)) {
      return res.status(400).json({ message: "A valid Exam Type is required" });
    }

    // Check for duplicate submission for the same semester and exam type by this student
    const existingForm = await ExaminationForm.findOne({
      student: studentId,
      semesterYear,
      examType,
    });

    if (existingForm) {
      return res.status(400).json({
        message: `You have already submitted an examination form for Semester/Year ${semesterYear} and Exam Type ${examType}.`,
      });
    }

    // --- AUTOMATED ELIGIBILITY ENGINE VALIDATION ---
    // In a real production scenario, these context values would be dynamically queried 
    // from the Attendance and Finance microservices/collections.
    // We mock standard metrics here to satisfy the validation engine for demonstration.
    const contextData = {
      attendancePercentage: 80, // e.g., fetched from Attendance service
      feeDueBalance: 0,        // e.g., fetched from Finance service
      cgpa: 7.5,
      activeDisciplinaryHolds: 0
    };

    const eligibilityResult = await evaluateEligibility(studentId, 'ExamForm', contextData);
    
    if (!eligibilityResult.isEligible) {
      return res.status(403).json({
        message: "You are not eligible to submit this examination form.",
        failedCriteria: eligibilityResult.failedCriteria
      });
    }
    // -----------------------------------------------

    // Create the exam form
    const newForm = await ExaminationForm.create({
      student: studentId,
      studentName,
      rollNumber,
      courseDept,
      semesterYear,
      subjects,
      examType,
    });

    res.status(201).json({
      message: "Examination form submitted successfully!",
      form: newForm,
    });
  } catch (error) {
    console.error("Error submitting exam form:", error);
    res.status(500).json({ message: "Server error during form submission" });
  }
};

// @desc    Get all examination forms
// @route   GET /api/exam-forms
// @access  Private (Student: own forms, HOD: all forms)
export const getExamForms = async (req, res) => {
  try {
    const { role, id } = req.user;

    if (role === "hod") {
      // HOD can see all submissions
      const forms = await ExaminationForm.find()
        .populate("student", "name email studentId")
        .sort({ createdAt: -1 });
      return res.json(forms);
    } else if (role === "student") {
      // Students only see their own submissions
      const forms = await ExaminationForm.find({ student: id }).sort({ createdAt: -1 });
      return res.json(forms);
    } else if (role === "parent") {
      const User = (await import("../models/User.model.js")).default;
      const parentUser = await User.findById(id);
      if (parentUser && parentUser.studentId) {
        const studentUser = await User.findOne({ studentId: parentUser.studentId, role: "student" });
        if (studentUser) {
          const forms = await ExaminationForm.find({ student: studentUser._id }).sort({ createdAt: -1 });
          return res.json(forms);
        }
      }
      return res.json([]);
    } else {
      return res.status(403).json({ message: "Access forbidden" });
    }
  } catch (error) {
    console.error("Error fetching exam forms:", error);
    res.status(500).json({ message: "Server error fetching forms" });
  }
};

// @desc    Update status of an examination form
// @route   PUT /api/exam-forms/:id/status
// @access  Private (HOD only)
export const updateExamFormStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["Pending", "Approved", "Rejected"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const form = await ExaminationForm.findById(id);
    if (!form) {
      return res.status(404).json({ message: "Examination form not found" });
    }

    form.status = status;
    await form.save();

    res.json({
      message: `Examination form status updated to ${status} successfully!`,
      form,
    });
  } catch (error) {
    console.error("Error updating exam form status:", error);
    res.status(500).json({ message: "Server error updating form status" });
  }
};

// @desc    Delete an examination form submission
// @route   DELETE /api/exam-forms/:id
// @access  Private (HOD only)
export const deleteExamForm = async (req, res) => {
  try {
    const { id } = req.params;

    const form = await ExaminationForm.findById(id);
    if (!form) {
      return res.status(404).json({ message: "Examination form not found" });
    }

    await ExaminationForm.findByIdAndDelete(id);

    res.json({ message: "Examination form deleted successfully" });
  } catch (error) {
    console.error("Error deleting exam form:", error);
    res.status(500).json({ message: "Server error deleting form" });
  }
};
