import ExamHall from "../models/ExamHall.model.js";
import HallAllocation from "../models/HallAllocation.model.js";
import ExamSchedule from "../models/ExamSchedule.model.js";
import ExaminationForm from "../models/ExaminationForm.model.js";
import User from "../models/User.model.js";
import PDFDocument from "pdfkit";
import {
  allocateAntiCheatSeating,
  validateNoSideBySideSameCourse,
} from "../utils/seatingPlan.utils.js";

async function loadExamStudents(examScheduleId) {
  const examSchedule = await ExamSchedule.findById(examScheduleId);
  if (!examSchedule) {
    const err = new Error("Exam schedule not found");
    err.status = 404;
    throw err;
  }

  const approvedForms = await ExaminationForm.find({
    courseDept: examSchedule.course,
    status: "Approved",
  });

  if (approvedForms.length === 0) {
    const err = new Error(
      "No approved examination forms found for this course. Students must submit and get forms approved first."
    );
    err.status = 400;
    throw err;
  }

  const studentIds = approvedForms.map((form) => form.student);
  const students = await User.find({
    _id: { $in: studentIds },
    role: "student",
  }).select("name studentId course department semester");

  if (students.length === 0) {
    const err = new Error("No student records found for the approved examination forms.");
    err.status = 400;
    throw err;
  }

  return { examSchedule, students };
}

/**
 * POST /api/seating-plans/generate
 * Anti-cheat interleaved seating with optional per-hall layout overrides.
 */
export const generateSeatingPlan = async (req, res) => {
  try {
    const { examScheduleId, hallIds, layouts } = req.body;
    if (!examScheduleId) {
      return res.status(400).json({ message: "examScheduleId is required" });
    }

    const { examSchedule, students } = await loadExamStudents(examScheduleId);

    let halls;
    if (hallIds?.length) {
      halls = await ExamHall.find({ _id: { $in: hallIds }, isActive: true });
      if (!halls.length) {
        return res.status(400).json({ message: "None of the specified halls are active or exist." });
      }
    } else {
      halls = await ExamHall.find({ isActive: true });
      if (!halls.length) {
        return res
          .status(400)
          .json({ message: "No active examination halls available. Please create halls first." });
      }
    }

    // Archive previous draft/published for this exam so student views stay clean
    await HallAllocation.updateMany(
      { examSchedule: examScheduleId, status: { $in: ["draft", "published"] } },
      { $set: { status: "archived" } }
    );

    const layoutOverrides = layouts || {};
    const result = allocateAntiCheatSeating(students, halls, layoutOverrides);

    // Persist seat fields compatible with HallAllocation (+ row/col)
    const allocations = result.allocations.map((group) => ({
      hall: group.hall,
      hallName: group.hallName,
      seats: group.seats.map((s) => ({
        seatNumber: s.seatNumber,
        student: s.student,
        studentName: s.studentName,
        rollNumber: s.rollNumber,
        department: s.department,
        row: s.row,
        col: s.col,
      })),
    }));

    const adjacency = validateNoSideBySideSameCourse(allocations);
    if (!adjacency.valid) {
      result.warnings.push(...adjacency.errors.slice(0, 10));
    }

    const seatingPlan = await HallAllocation.create({
      examSchedule: examScheduleId,
      allocatedBy: req.user.id,
      strategy: "anti-cheat-interleaved",
      status: "draft",
      totalStudents: result.totalStudents,
      totalHalls: result.totalHalls,
      allocations,
      warnings: result.warnings,
    });

    res.status(201).json({
      message: "Anti-cheat seating plan generated successfully",
      seatingPlan,
      exam: {
        examName: examSchedule.examName,
        course: examSchedule.course,
        examDate: examSchedule.examDate,
        startTime: examSchedule.startTime,
        endTime: examSchedule.endTime,
      },
      layoutMeta: result.layoutMeta,
      adjacencyViolations: result.adjacencyViolations,
    });
  } catch (error) {
    console.error("Error generating seating plan:", error);
    res.status(error.status || 500).json({
      message: error.message || "Server error generating seating plan",
    });
  }
};

/**
 * GET /api/seating-plans/:id
 */
export const getSeatingPlan = async (req, res) => {
  try {
    const plan = await HallAllocation.findById(req.params.id)
      .populate("allocatedBy", "name email")
      .populate("allocations.hall", "name building floor capacity rows columns")
      .populate("examSchedule");

    if (!plan || plan.strategy !== "anti-cheat-interleaved") {
      return res.status(404).json({ message: "Seating plan not found" });
    }

    res.json(plan);
  } catch (error) {
    console.error("Error fetching seating plan:", error);
    res.status(500).json({ message: "Server error fetching seating plan" });
  }
};

/**
 * PUT /api/seating-plans/:id/publish
 */
export const publishSeatingPlan = async (req, res) => {
  try {
    const plan = await HallAllocation.findById(req.params.id);
    if (!plan || plan.strategy !== "anti-cheat-interleaved") {
      return res.status(404).json({ message: "Seating plan not found" });
    }
    if (plan.status === "archived") {
      return res.status(400).json({ message: "Cannot publish an archived plan" });
    }

    plan.status = "published";
    await plan.save();

    res.json({
      message: "Seating plan published. Students can view hall, desk, and floor map.",
      seatingPlan: plan,
    });
  } catch (error) {
    console.error("Error publishing seating plan:", error);
    res.status(500).json({ message: "Server error publishing seating plan" });
  }
};

/**
 * GET /api/seating-plans/:id/export/door-notice
 * One-page-per-hall door notice sheet.
 */
export const exportDoorNoticePDF = async (req, res) => {
  try {
    const plan = await HallAllocation.findById(req.params.id);
    if (!plan) return res.status(404).json({ message: "Seating plan not found" });

    const exam = await ExamSchedule.findById(plan.examSchedule);
    const halls = await ExamHall.find({
      _id: { $in: plan.allocations.map((a) => a.hall) },
    });
    const hallMap = Object.fromEntries(halls.map((h) => [h._id.toString(), h]));

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=door-notice-${plan._id}.pdf`
    );
    doc.pipe(res);

    plan.allocations.forEach((group, index) => {
      if (index > 0) doc.addPage();
      const hall = hallMap[group.hall.toString()];

      doc.fontSize(20).font("Helvetica-Bold").text("EXAM HALL DOOR NOTICE", {
        align: "center",
      });
      doc.moveDown(0.5);
      doc.fontSize(14).font("Helvetica").text(`Hall: ${group.hallName}`, { align: "center" });
      if (hall) {
        doc.text(`Building: ${hall.building}  |  Floor: ${hall.floor ?? 0}`, {
          align: "center",
        });
      }
      if (exam) {
        doc.moveDown(0.3);
        doc.fontSize(12).text(`${exam.examName} — ${exam.course}`, { align: "center" });
        doc.text(`${exam.examDate}  ${exam.startTime || ""}–${exam.endTime || ""}`, {
          align: "center",
        });
      }
      doc.moveDown();
      doc.fontSize(11).font("Helvetica-Bold");
      doc.text("Seat", 50, doc.y, { continued: true });
      doc.text("Roll No", 120, undefined, { continued: true });
      doc.text("Name", 220, undefined, { continued: true });
      doc.text("Course", 400);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.4);
      doc.font("Helvetica").fontSize(10);

      const sorted = [...group.seats].sort((a, b) =>
        a.seatNumber.localeCompare(b.seatNumber, undefined, { numeric: true })
      );
      for (const seat of sorted) {
        if (doc.y > 750) {
          doc.addPage();
          doc.fontSize(12).font("Helvetica-Bold").text(`${group.hallName} (continued)`);
          doc.moveDown();
          doc.font("Helvetica").fontSize(10);
        }
        const y = doc.y;
        doc.text(seat.seatNumber, 50, y);
        doc.text(seat.rollNumber || "-", 120, y);
        doc.text(seat.studentName || "-", 220, y, { width: 170 });
        doc.text(seat.department || "-", 400, y, { width: 140 });
        doc.moveDown(0.55);
      }

      doc.moveDown();
      doc.fontSize(9).fillColor("gray").text("Post this sheet on the hall door. Students enter only with ID card.", {
        align: "center",
      });
      doc.fillColor("black");
    });

    doc.end();
  } catch (error) {
    console.error("Error exporting door notice:", error);
    res.status(500).json({ message: "Failed to export door notice PDF" });
  }
};

/**
 * GET /api/seating-plans/:id/export/invigilator
 * Master invigilator list across all halls.
 */
export const exportInvigilatorPDF = async (req, res) => {
  try {
    const plan = await HallAllocation.findById(req.params.id);
    if (!plan) return res.status(404).json({ message: "Seating plan not found" });

    const exam = await ExamSchedule.findById(plan.examSchedule);

    const doc = new PDFDocument({ margin: 40, size: "A4", layout: "landscape" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invigilator-list-${plan._id}.pdf`
    );
    doc.pipe(res);

    doc.fontSize(18).font("Helvetica-Bold").text("INVIGILATOR MASTER SEATING LIST", {
      align: "center",
    });
    if (exam) {
      doc.fontSize(12).font("Helvetica").text(
        `${exam.examName} | ${exam.course} | ${exam.examDate} ${exam.startTime || ""}–${exam.endTime || ""}`,
        { align: "center" }
      );
    }
    doc
      .fontSize(10)
      .text(
        `Strategy: anti-cheat interleaved | Students: ${plan.totalStudents} | Halls: ${plan.totalHalls}`,
        { align: "center" }
      );
    doc.moveDown();

    for (const group of plan.allocations) {
      if (doc.y > 480) doc.addPage();
      doc.fontSize(13).font("Helvetica-Bold").fillColor("black").text(`Hall: ${group.hallName}`);
      doc.moveDown(0.3);

      const headerY = doc.y;
      doc.fontSize(9).font("Helvetica-Bold");
      doc.text("Seat", 40, headerY);
      doc.text("Row/Col", 90, headerY);
      doc.text("Roll Number", 150, headerY);
      doc.text("Student Name", 260, headerY);
      doc.text("Course / Dept", 480, headerY);
      doc.moveTo(40, headerY + 12).lineTo(780, headerY + 12).stroke();
      doc.moveDown(0.6);
      doc.font("Helvetica");

      const sorted = [...group.seats].sort((a, b) =>
        a.seatNumber.localeCompare(b.seatNumber, undefined, { numeric: true })
      );
      for (const seat of sorted) {
        if (doc.y > 520) {
          doc.addPage();
          doc.fontSize(11).font("Helvetica-Bold").text(`${group.hallName} (continued)`);
          doc.moveDown(0.4);
          doc.font("Helvetica").fontSize(9);
        }
        const y = doc.y;
        const rc =
          seat.row != null && seat.col != null
            ? `R${seat.row + 1}/C${seat.col + 1}`
            : "-";
        doc.text(seat.seatNumber, 40, y);
        doc.text(rc, 90, y);
        doc.text(seat.rollNumber || "-", 150, y);
        doc.text(seat.studentName || "-", 260, y, { width: 200 });
        doc.text(seat.department || "-", 480, y, { width: 280 });
        doc.moveDown(0.5);
      }
      doc.moveDown(0.8);
    }

    doc.fontSize(8).fillColor("gray").text(
      `Generated ${new Date().toLocaleString()} — For invigilators only`,
      40,
      560,
      { align: "center", width: 740 }
    );

    doc.end();
  } catch (error) {
    console.error("Error exporting invigilator list:", error);
    res.status(500).json({ message: "Failed to export invigilator PDF" });
  }
};

/**
 * GET /api/seating-plans/student/my-seat
 * Student portal: hall, desk, and floor-map grid for published anti-cheat plans
 * (falls back to any published hall allocation).
 */
export const getStudentSeatMap = async (req, res) => {
  try {
    const studentId = req.user.id;
    const plans = await HallAllocation.find({ status: "published" })
      .populate("examSchedule")
      .populate("allocations.hall", "name building floor rows columns")
      .sort({ updatedAt: -1 });

    const results = [];

    for (const plan of plans) {
      for (const group of plan.allocations) {
        const seat = group.seats.find((s) => s.student.toString() === studentId);
        if (!seat) continue;

        const hallDoc = group.hall;
        const rows = hallDoc?.rows || Math.max(...group.seats.map((s) => (s.row ?? 0) + 1), 1);
        const columns =
          hallDoc?.columns || Math.max(...group.seats.map((s) => (s.col ?? 0) + 1), 1);

        const floorMap = Array.from({ length: rows }, (_, r) =>
          Array.from({ length: columns }, (_, c) => {
            const cell = group.seats.find((s) => s.row === r && s.col === c);
            if (!cell) {
              // try label match if row/col missing
              return { empty: true };
            }
            const isMine = cell.student.toString() === studentId;
            return {
              seatNumber: cell.seatNumber,
              occupied: true,
              isMine,
              department: isMine ? cell.department : undefined,
            };
          })
        );

        // If row/col missing on older data, build from seat labels loosely
        const hasCoords = group.seats.some((s) => s.row != null && s.col != null);

        results.push({
          examName: plan.examSchedule?.examName || "",
          course: plan.examSchedule?.course || "",
          examDate: plan.examSchedule?.examDate || "",
          startTime: plan.examSchedule?.startTime || "",
          endTime: plan.examSchedule?.endTime || "",
          hallName: group.hallName || hallDoc?.name || "",
          building: hallDoc?.building || "",
          floor: hallDoc?.floor ?? 0,
          seatNumber: seat.seatNumber,
          deskNumber: seat.seatNumber,
          strategy: plan.strategy,
          rows,
          columns,
          floorMap: hasCoords ? floorMap : null,
          myRow: seat.row,
          myCol: seat.col,
        });
      }
    }

    if (!results.length) {
      return res.status(404).json({ message: "No published seat assignment found" });
    }

    res.json(results);
  } catch (error) {
    console.error("Error fetching student seat map:", error);
    res.status(500).json({ message: "Server error fetching seat map" });
  }
};
