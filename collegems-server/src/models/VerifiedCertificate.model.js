import mongoose from "mongoose";

const gradeSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true },
    code: { type: String },
    grade: { type: String, required: true },
    credits: { type: Number },
  },
  { _id: false },
);

const verifiedCertificateSchema = new mongoose.Schema(
  {
    certId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["transcript", "degree", "marksheet"],
      default: "transcript",
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    studentId: { type: String, required: true },
    studentName: { type: String, required: true },
    course: { type: String },
    department: { type: String },
    semester: { type: String },
    cgpa: { type: String },
    degreeTitle: { type: String },
    grades: [gradeSchema],
    issuedAt: { type: Date, required: true },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // Cryptographic seal
    recordHash: { type: String, required: true },
    merkleRoot: { type: String, required: true },
    signature: { type: String, required: true },
    algorithm: { type: String, default: "SHA-256+RSA-PSS" },
    publicKeyFingerprint: { type: String },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    verificationUrl: { type: String },
    qrCodeDataUrl: { type: String },
    revoked: { type: Boolean, default: false },
    revokeReason: { type: String },
  },
  { timestamps: true },
);

export default mongoose.models.VerifiedCertificate ||
  mongoose.model("VerifiedCertificate", verifiedCertificateSchema);
