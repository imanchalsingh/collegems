import User from "../models/User.model.js";
import {
  buildIdCardPdf,
  buildVerificationToken,
  computeIdCardExpiry,
  decodeVerificationToken,
  getCourseValidityYears,
} from "../utils/idcardPdf.js";

const buildVerificationUrl = (req, studentId) => {
  const base = process.env.VERIFY_BASE_URL
    || `${req.protocol}://${req.get("host")}`;
  return `${base.replace(/\/$/, "")}/api/verify/student/${encodeURIComponent(studentId)}`;
};

const findStudentByUserId = async (userId) => {
  const student = await User.findOne({ _id: userId, role: "student" })
    .select("name email studentId course semester role")
    .lean();
  return student;
};

const findStudentByStudentId = async (studentId) => {
  const student = await User.findOne({
    studentId: String(studentId).trim(),
    role: "student",
  })
    .select("name email studentId course semester role")
    .lean();
  return student;
};

export const downloadMyIdCard = async (req, res) => {
  try {
    const student = await findStudentByUserId(req.user.id);
    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    const verificationUrl = buildVerificationUrl(req, student.studentId);
    const validUntil = computeIdCardExpiry(student);
    const pdfBuffer = await buildIdCardPdf({
      student,
      verificationUrl,
      validUntil,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="id-card-${student.studentId}.pdf"`,
    );
    res.setHeader("Content-Length", pdfBuffer.length);
    res.setHeader("X-Id-Card-Valid-Until", validUntil.toISOString());
    return res.send(pdfBuffer);
  } catch (err) {
    console.error("downloadMyIdCard error:", err);
    return res.status(500).json({ message: "Failed to generate ID card" });
  }
};

export const downloadStudentIdCard = async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await findStudentByStudentId(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const verificationUrl = buildVerificationUrl(req, student.studentId);
    const validUntil = computeIdCardExpiry(student);
    const pdfBuffer = await buildIdCardPdf({
      student,
      verificationUrl,
      validUntil,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="id-card-${student.studentId}.pdf"`,
    );
    res.setHeader("Content-Length", pdfBuffer.length);
    res.setHeader("X-Id-Card-Valid-Until", validUntil.toISOString());
    return res.send(pdfBuffer);
  } catch (err) {
    console.error("downloadStudentIdCard error:", err);
    return res.status(500).json({ message: "Failed to generate ID card" });
  }
};

export const getMyIdCardData = async (req, res) => {
  try {
    const student = await findStudentByUserId(req.user.id);
    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    const verificationUrl = buildVerificationUrl(req, student.studentId);
    const validUntil = computeIdCardExpiry(student);
    return res.json({
      student,
      verificationUrl,
      validUntil: validUntil.toISOString(),
      validityYears: getCourseValidityYears(student.course),
      qrPayload: buildVerificationToken(student),
    });
  } catch (err) {
    console.error("getMyIdCardData error:", err);
    return res.status(500).json({ message: "Failed to load ID card data" });
  }
};

export const verifyStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await findStudentByStudentId(studentId);

    if (!student) {
      return res.status(404).json({
        valid: false,
        message: "No matching student record found",
      });
    }

    return res.json({
      valid: true,
      verifiedAt: new Date().toISOString(),
      student: {
        name: student.name,
        studentId: student.studentId,
        course: student.course,
        semester: student.semester,
      },
    });
  } catch (err) {
    console.error("verifyStudent error:", err);
    return res.status(500).json({ valid: false, message: "Verification failed" });
  }
};

export const verifyToken = async (req, res) => {
  try {
    const { token } = req.params;
    const payload = decodeVerificationToken(token);
    if (!payload?.sid) {
      return res.status(400).json({ valid: false, message: "Invalid token" });
    }

    const student = await findStudentByStudentId(payload.sid);
    if (!student) {
      return res.status(404).json({ valid: false, message: "Student not found" });
    }

    return res.json({
      valid: true,
      verifiedAt: new Date().toISOString(),
      student: {
        name: student.name,
        studentId: student.studentId,
        course: student.course,
        semester: student.semester,
      },
    });
  } catch (err) {
    console.error("verifyToken error:", err);
    return res.status(500).json({ valid: false, message: "Verification failed" });
  }
};
