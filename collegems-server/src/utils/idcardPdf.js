import PDFDocument from "pdfkit";
import QRCode from "qrcode";

const COLLEGE_NAME = process.env.COLLEGE_NAME || "Smart College of Engineering";
const COLLEGE_TAGLINE = process.env.COLLEGE_TAGLINE || "Smart College Management System";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
export const MIN_VALIDITY_YEARS = 2;

export const COURSE_VALIDITY_YEARS = {
  "b.tech": 4,
  "btech": 4,
  "b.e.": 4,
  "be": 4,
  "computer science": 4,
  "computer science and engineering": 4,
  "information technology": 4,
  "information science": 4,
  "electrical": 4,
  "electrical engineering": 4,
  "mechanical": 4,
  "mechanical engineering": 4,
  "civil": 4,
  "civil engineering": 4,
  "electronics": 4,
  "electronics and communication": 4,
  "bca": 3,
  "bachelor of computer applications": 3,
  "bba": 3,
  "bachelor of business administration": 3,
  "b.sc": 3,
  "bsc": 3,
  "bachelor of science": 3,
  "b.com": 3,
  "bcom": 3,
  "bachelor of commerce": 3,
  "m.tech": 2,
  "mtech": 2,
  "master of technology": 2,
  "mca": 2,
  "master of computer applications": 2,
  "mba": 2,
  "master of business administration": 2,
  "m.sc": 2,
  "msc": 2,
  "master of science": 2,
};

const normalizeCourseKey = (course) =>
  (course || "").toLowerCase().trim().replace(/\s+/g, " ");

export const getCourseValidityYears = (course) => {
  const key = normalizeCourseKey(course);
  if (COURSE_VALIDITY_YEARS[key] !== undefined) {
    return COURSE_VALIDITY_YEARS[key];
  }
  return MIN_VALIDITY_YEARS;
};

export const computeIdCardExpiry = (student, fallback) => {
  if (fallback instanceof Date && !Number.isNaN(fallback.getTime())) {
    return fallback;
  }
  if (fallback) {
    const parsed = new Date(fallback);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const years = getCourseValidityYears(student?.course);
  return new Date(Date.now() + years * 365 * DAY_IN_MS);
};

const ID_CARD = {
  width: 243, // 3.375" in points (CR80)
  height: 153, // 2.125" in points (CR80)
  margin: 8,
  qrSize: 56,
  avatarSize: 36,
};

const COLORS = {
  primary: "#1e3a8a",
  primaryLight: "#3b82f6",
  accent: "#0ea5e9",
  text: "#0f172a",
  muted: "#475569",
  border: "#cbd5e1",
  background: "#f8fafc",
};

const generateQrPng = async (text) => {
  return QRCode.toBuffer(text, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 256,
    color: { dark: "#0f172a", light: "#ffffff" },
  });
};

const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const drawHeader = (doc) => {
  const { width, margin } = ID_CARD;

  doc
    .rect(0, 0, width, 22)
    .fill(COLORS.primary);

  doc
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(9)
    .text(COLLEGE_NAME.toUpperCase(), margin, 5, {
      width: width - margin * 2,
      align: "center",
    });

  doc
    .font("Helvetica")
    .fontSize(5.5)
    .fillColor("#dbeafe")
    .text(COLLEGE_TAGLINE, margin, 15, {
      width: width - margin * 2,
      align: "center",
    });

  doc.fillColor(COLORS.text);
};

const drawAvatar = (doc, name) => {
  const { margin, avatarSize, height } = ID_CARD;
  const cx = margin + avatarSize / 2 + 2;
  const cy = height - margin - 18 - avatarSize / 2;

  doc
    .circle(cx, cy, avatarSize / 2)
    .fillAndStroke(COLORS.primaryLight, COLORS.primary);

  const initials = (name || "?")
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  doc
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(14)
    .text(initials, cx - avatarSize / 2, cy - 7, {
      width: avatarSize,
      align: "center",
    });

  doc.fillColor(COLORS.text);
};

const drawField = (doc, label, value, x, y, width) => {
  doc
    .font("Helvetica")
    .fontSize(5)
    .fillColor(COLORS.muted)
    .text(label.toUpperCase(), x, y, { width });

  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor(COLORS.text)
    .text(value || "—", x, y + 6, { width, lineBreak: false });
};

const drawQr = (doc, qrBuffer) => {
  const { width, margin, height, qrSize } = ID_CARD;
  const x = width - margin - qrSize;
  const y = height - margin - qrSize - 4;

  doc
    .rect(x - 2, y - 2, qrSize + 4, qrSize + 4)
    .fillAndStroke("#ffffff", COLORS.border)
    .lineWidth(0.5);

  doc.image(qrBuffer, x, y, { width: qrSize, height: qrSize });
};

const drawFooter = (doc, issuedAt, validUntil) => {
  const { width, height, margin } = ID_CARD;

  doc
    .moveTo(margin, height - 18)
    .lineTo(width - margin, height - 18)
    .strokeColor(COLORS.border)
    .lineWidth(0.5)
    .stroke();

  doc
    .font("Helvetica")
    .fontSize(5)
    .fillColor(COLORS.muted)
    .text(`Issued: ${formatDate(issuedAt)}`, margin, height - 14, {
      width: 90,
    })
    .text(`Valid until: ${formatDate(validUntil)}`, margin, height - 9, {
      width: 90,
    });
};

export const buildIdCardPdf = async ({
  student,
  verificationUrl,
  issuedAt = new Date(),
  validUntil,
}) => {
  if (!student) throw new Error("buildIdCardPdf: student is required");
  if (!verificationUrl)
    throw new Error("buildIdCardPdf: verificationUrl is required");

  const expiry = computeIdCardExpiry(student, validUntil);

  const qrBuffer = await generateQrPng(verificationUrl);

  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({
      size: [ID_CARD.width, ID_CARD.height],
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      info: {
        Title: `Student ID Card - ${student.name}`,
        Author: COLLEGE_NAME,
        Subject: "Digital Student Identification",
      },
    });

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.rect(0, 0, ID_CARD.width, ID_CARD.height).fill(COLORS.background);

    drawHeader(doc);
    drawAvatar(doc, student.name);
    drawFooter(doc, issuedAt, expiry);

    const fieldsX = ID_CARD.margin + ID_CARD.avatarSize + 10;
    const fieldsY = 32;
    const fieldsWidth = ID_CARD.width - fieldsX - ID_CARD.qrSize - 18;

    drawField(doc, "Name", student.name, fieldsX, fieldsY, fieldsWidth);
    drawField(
      doc,
      "Student ID",
      student.studentId,
      fieldsX,
      fieldsY + 18,
      fieldsWidth,
    );
    drawField(
      doc,
      "Course",
      student.course,
      fieldsX,
      fieldsY + 36,
      fieldsWidth,
    );
    drawField(
      doc,
      "Semester",
      student.semester ? `Semester ${student.semester}` : "",
      fieldsX,
      fieldsY + 54,
      fieldsWidth,
    );
    drawField(
      doc,
      "Email",
      student.email,
      fieldsX,
      fieldsY + 72,
      fieldsWidth,
    );

    drawQr(doc, qrBuffer);

    doc
      .font("Helvetica")
      .fontSize(4.5)
      .fillColor(COLORS.muted)
      .text("Scan to verify", ID_CARD.width - ID_CARD.margin - ID_CARD.qrSize,
        ID_CARD.height - ID_CARD.margin - 2,
        { width: ID_CARD.qrSize, align: "center" });

    doc.end();
  });
};

export const buildVerificationToken = (student) => {
  const payload = {
    sid: student.studentId,
    uid: String(student._id),
    iat: Date.now(),
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
};

export const decodeVerificationToken = (token) => {
  try {
    return JSON.parse(Buffer.from(token, "base64url").toString("utf8"));
  } catch {
    return null;
  }
};
