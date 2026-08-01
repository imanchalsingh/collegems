import crypto from "crypto";
import QRCode from "qrcode";
import PDFDocument from "pdfkit";
import User from "../models/User.model.js";
import VerifiedCertificate from "../models/VerifiedCertificate.model.js";
import {
  sealAcademicRecord,
  verifyAcademicSeal,
  getPublicKeyPem,
} from "../utils/cryptoSigner.js";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const COLLEGE_NAME = process.env.COLLEGE_NAME || "College Management System";

function buildCertId() {
  return `CMS-${crypto.randomBytes(8).toString("hex").toUpperCase()}`;
}

function buildPayload({
  certId,
  type,
  student,
  grades,
  cgpa,
  degreeTitle,
  issuedAt,
}) {
  return {
    certId,
    type,
    studentId: student.studentId || String(student._id),
    studentName: student.name,
    course: student.course || "",
    department: student.department || student.departmentCode || "",
    semester: student.semester != null ? String(student.semester) : "",
    cgpa: cgpa != null ? String(cgpa) : "",
    degreeTitle: degreeTitle || "",
    grades: (grades || []).map((g) => ({
      subject: g.subject,
      code: g.code || "",
      grade: g.grade,
      credits: g.credits ?? null,
    })),
    issuedAt: issuedAt.toISOString(),
    issuer: COLLEGE_NAME,
  };
}

export const issueCertificate = async (req, res) => {
  try {
    const {
      studentId,
      type = "transcript",
      grades = [],
      cgpa,
      degreeTitle,
    } = req.body || {};

    if (!studentId) {
      return res.status(400).json({ message: "studentId is required" });
    }

    const studentQuery = { role: { $in: ["student", "alumni"] } };
    if (/^[a-f\d]{24}$/i.test(String(studentId))) {
      studentQuery.$or = [{ _id: studentId }, { studentId: String(studentId) }];
    } else {
      studentQuery.studentId = String(studentId);
    }

    const student = await User.findOne(studentQuery);

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const certId = buildCertId();
    const issuedAt = new Date();
    const payload = buildPayload({
      certId,
      type,
      student,
      grades,
      cgpa,
      degreeTitle,
      issuedAt,
    });

    const seal = sealAcademicRecord(payload);
    const verificationUrl = `${FRONTEND_URL}/verify-certificate/${certId}`;
    const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 256,
    });

    const doc = await VerifiedCertificate.create({
      certId,
      type,
      student: student._id,
      studentId: payload.studentId,
      studentName: payload.studentName,
      course: payload.course,
      department: payload.department,
      semester: payload.semester,
      cgpa: payload.cgpa,
      degreeTitle: payload.degreeTitle,
      grades: payload.grades,
      issuedAt,
      issuedBy: req.user.id,
      recordHash: seal.recordHash,
      merkleRoot: seal.merkleRoot,
      signature: seal.signature,
      algorithm: seal.algorithm,
      publicKeyFingerprint: seal.publicKeyFingerprint,
      payload: seal.payload,
      verificationUrl,
      qrCodeDataUrl,
    });

    res.status(201).json({
      message: "Certificate issued with cryptographic seal",
      certificate: {
        certId: doc.certId,
        type: doc.type,
        studentName: doc.studentName,
        studentId: doc.studentId,
        merkleRoot: doc.merkleRoot,
        recordHash: doc.recordHash,
        signature: doc.signature,
        algorithm: doc.algorithm,
        publicKeyFingerprint: doc.publicKeyFingerprint,
        verificationUrl: doc.verificationUrl,
        qrCodeDataUrl: doc.qrCodeDataUrl,
        issuedAt: doc.issuedAt,
      },
    });
  } catch (err) {
    console.error("Issue certificate error:", err);
    res.status(500).json({ message: "Failed to issue certificate" });
  }
};

export const verifyCertificatePublic = async (req, res) => {
  try {
    const { certId } = req.params;
    const claimedPayload = req.body?.claimedPayload || req.query?.claimed
      ? safeParse(req.body?.claimedPayload || req.query.claimed)
      : null;

    const cert = await VerifiedCertificate.findOne({ certId }).lean();
    if (!cert) {
      return res.status(404).json({
        valid: false,
        message: "Certificate not found",
      });
    }

    if (cert.revoked) {
      return res.status(410).json({
        valid: false,
        revoked: true,
        message: cert.revokeReason || "This certificate has been revoked",
        certId: cert.certId,
      });
    }

    const sealCheck = verifyAcademicSeal({
      payload: cert.payload,
      merkleRoot: cert.merkleRoot,
      signature: cert.signature,
      claimedPayload,
    });

    res.json({
      valid: sealCheck.valid,
      certId: cert.certId,
      type: cert.type,
      studentName: cert.studentName,
      studentId: cert.studentId,
      course: cert.course,
      department: cert.department,
      semester: cert.semester,
      cgpa: cert.cgpa,
      degreeTitle: cert.degreeTitle,
      grades: cert.grades,
      issuedAt: cert.issuedAt,
      merkleRoot: cert.merkleRoot,
      recordHash: cert.recordHash,
      algorithm: cert.algorithm,
      publicKeyFingerprint: cert.publicKeyFingerprint,
      merkleMatches: sealCheck.merkleMatches,
      signatureValid: sealCheck.signatureValid,
      tampered: sealCheck.tampered,
      tamperedFields: sealCheck.tamperedFields,
      message: sealCheck.valid
        ? "Certificate is authentic and untampered"
        : sealCheck.tampered
          ? "Tamper detected: presented fields do not match the sealed record"
          : !sealCheck.signatureValid
            ? "Digital signature verification failed"
            : "Merkle root mismatch — record may be corrupted",
      verifiedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Verify certificate error:", err);
    res.status(500).json({ valid: false, message: "Verification failed" });
  }
};

function safeParse(value) {
  if (typeof value === "object" && value !== null) return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export const detectTamper = async (req, res) => {
  try {
    const { certId } = req.params;
    const claimedPayload = req.body?.claimedPayload || req.body;
    if (!claimedPayload || typeof claimedPayload !== "object") {
      return res.status(400).json({ message: "claimedPayload object is required" });
    }

    const cert = await VerifiedCertificate.findOne({ certId }).lean();
    if (!cert) {
      return res.status(404).json({ message: "Certificate not found" });
    }

    const sealCheck = verifyAcademicSeal({
      payload: cert.payload,
      merkleRoot: cert.merkleRoot,
      signature: cert.signature,
      claimedPayload,
    });

    res.json({
      certId,
      tampered: sealCheck.tampered || !sealCheck.merkleMatches || !sealCheck.signatureValid,
      tamperedFields: sealCheck.tamperedFields,
      valid: sealCheck.valid,
      merkleMatches: sealCheck.merkleMatches,
      signatureValid: sealCheck.signatureValid,
      alert: sealCheck.valid
        ? null
        : "TAMPER ALERT: Transcript fields do not match the cryptographic seal",
    });
  } catch (err) {
    console.error("Tamper detect error:", err);
    res.status(500).json({ message: "Tamper check failed" });
  }
};

export const downloadCertificatePdf = async (req, res) => {
  try {
    const { certId } = req.params;
    const cert = await VerifiedCertificate.findOne({ certId });
    if (!cert) {
      return res.status(404).json({ message: "Certificate not found" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${cert.certId}.pdf"`,
    );

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    doc.pipe(res);

    doc.fontSize(18).text(COLLEGE_NAME, { align: "center" });
    doc.moveDown(0.3);
    doc
      .fontSize(14)
      .fillColor("#1e3a8a")
      .text(
        cert.type === "degree" ? "Official Degree Certificate" : "Official Academic Transcript",
        { align: "center" },
      );
    doc.fillColor("#000000");
    doc.moveDown();
    doc.fontSize(11).text(`Certificate ID: ${cert.certId}`);
    doc.text(`Student: ${cert.studentName} (${cert.studentId})`);
    if (cert.course) doc.text(`Course: ${cert.course}`);
    if (cert.department) doc.text(`Department: ${cert.department}`);
    if (cert.semester) doc.text(`Semester: ${cert.semester}`);
    if (cert.cgpa) doc.text(`CGPA: ${cert.cgpa}`);
    if (cert.degreeTitle) doc.text(`Degree: ${cert.degreeTitle}`);
    doc.text(`Issued: ${new Date(cert.issuedAt).toLocaleString()}`);
    doc.moveDown();

    if (cert.grades?.length) {
      doc.fontSize(12).text("Grades", { underline: true });
      doc.moveDown(0.4);
      doc.fontSize(10);
      for (const g of cert.grades) {
        doc.text(
          `${g.code ? `${g.code} — ` : ""}${g.subject}: ${g.grade}${
            g.credits != null ? ` (${g.credits} cr)` : ""
          }`,
        );
      }
      doc.moveDown();
    }

    doc.fontSize(9).fillColor("#374151");
    doc.text(`Merkle Root: ${cert.merkleRoot}`);
    doc.text(`Record Hash: ${cert.recordHash}`);
    doc.text(`Signature (RSA-PSS): ${cert.signature.slice(0, 48)}…`);
    doc.text(`Verify: ${cert.verificationUrl}`);
    doc.fillColor("#000000");

    if (cert.qrCodeDataUrl) {
      const base64 = cert.qrCodeDataUrl.replace(/^data:image\/png;base64,/, "");
      const buf = Buffer.from(base64, "base64");
      doc.image(buf, doc.page.width - 160, doc.page.height - 180, {
        width: 110,
        height: 110,
      });
      doc
        .fontSize(8)
        .text("Scan to verify", doc.page.width - 160, doc.page.height - 65, {
          width: 110,
          align: "center",
        });
    }

    doc.end();
  } catch (err) {
    console.error("Certificate PDF error:", err);
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  }
};

export const getSigningPublicKey = async (_req, res) => {
  res.type("text/plain").send(getPublicKeyPem());
};

export const listIssuedCertificates = async (req, res) => {
  try {
    const certs = await VerifiedCertificate.find()
      .sort({ issuedAt: -1 })
      .limit(100)
      .select(
        "certId type studentName studentId course merkleRoot issuedAt verificationUrl revoked",
      )
      .lean();
    res.json({ certificates: certs });
  } catch (err) {
    console.error("List certificates error:", err);
    res.status(500).json({ message: "Failed to list certificates" });
  }
};
