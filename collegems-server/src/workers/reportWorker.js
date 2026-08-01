import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { emitJobProgress, emitJobEvent } from "../queues/jobProgress.js";

/**
 * Generate a simple report PDF in the background.
 * data: { title, lines: string[], requestedBy, fileName? }
 */
export async function processReportPdfJob(job, io) {
  const data = job.data || {};
  const requestedBy = data.requestedBy;
  const jobId = String(job.id);
  const title = data.title || "CollegeMS Report";
  const lines = Array.isArray(data.lines) ? data.lines : ["No content"];

  const emit = (progress, status, extra = {}) => {
    emitJobProgress(io, {
      queue: "ReportPDFQueue",
      jobId,
      name: job.name,
      progress,
      status,
      requestedBy,
      ...extra,
    });
  };

  emit(10, "active");
  if (typeof job.updateProgress === "function") await job.updateProgress(10);

  const outDir = path.join(process.cwd(), "secure-uploads", "reports");
  fs.mkdirSync(outDir, { recursive: true });
  const fileName =
    data.fileName ||
    `report_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.pdf`;
  const filePath = path.join(outDir, fileName);

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(18).text(title, { underline: true });
    doc.moveDown();
    doc.fontSize(10).fillColor("#666").text(`Generated: ${new Date().toISOString()}`);
    doc.moveDown();
    doc.fillColor("#000").fontSize(12);

    lines.forEach((line, idx) => {
      doc.text(String(line));
      if (idx % 20 === 0 && typeof job.updateProgress === "function") {
        const p = Math.min(90, 10 + Math.round((idx / Math.max(lines.length, 1)) * 80));
        job.updateProgress(p);
        emit(p, "active");
      }
    });

    doc.end();
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  if (typeof job.updateProgress === "function") await job.updateProgress(100);
  const relative = path.join("secure-uploads", "reports", fileName).replace(/\\/g, "/");
  emit(100, "completed", { filePath: relative });
  emitJobEvent(io, "queue:job_completed", {
    queue: "ReportPDFQueue",
    jobId,
    requestedBy,
    result: { filePath: relative },
  });
  return { filePath: relative };
}
