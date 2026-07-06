import ExamHall from "../models/ExamHall.model.js";
import HallAllocation from "../models/HallAllocation.model.js";
import ExamSchedule from "../models/ExamSchedule.model.js";
import ExaminationForm from "../models/ExaminationForm.model.js";
import User from "../models/User.model.js";
import { allocateStudents, validateAllocation } from "../utils/hallAllocation.utils.js";
import PDFDocument from "pdfkit";

// ─── Exam Hall CRUD ──────────────────────────────────────────────────────────

// @desc    Create a new examination hall
// @route   POST /api/exam-halls
// @access  Private (HOD only)
export const createHall = async (req, res) => {
  try {
    const { name, building, floor, rows, columns, facilities } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Hall name is required" });
    }
    if (!building || !building.trim()) {
      return res.status(400).json({ message: "Building name is required" });
    }
    if (!rows || rows < 1) {
      return res.status(400).json({ message: "Rows must be at least 1" });
    }
    if (!columns || columns < 1) {
      return res.status(400).json({ message: "Columns must be at least 1" });
    }

    // Check for duplicate hall name in the same building
    const existing = await ExamHall.findOne({ name: name.trim(), building: building.trim() });
    if (existing) {
      return res.status(400).json({ message: `Hall "${name}" already exists in ${building}` });
    }

    const hall = await ExamHall.create({
      name: name.trim(),
      building: building.trim(),
      floor: floor || 0,
      rows,
      columns,
      capacity: rows * columns,
      facilities: facilities || [],
      createdBy: req.user.id,
    });

    res.status(201).json({
      message: "Examination hall created successfully",
      hall,
    });
  } catch (error) {
    console.error("Error creating hall:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "A hall with this name already exists in this building" });
    }
    res.status(500).json({ message: "Server error creating hall" });
  }
};

// @desc    Get all examination halls
// @route   GET /api/exam-halls
// @access  Private (HOD, Teacher)
export const getHalls = async (req, res) => {
  try {
    const { active } = req.query;
    const filter = {};
    if (active === "true") filter.isActive = true;
    if (active === "false") filter.isActive = false;

    const halls = await ExamHall.find(filter)
      .populate("createdBy", "name email")
      .sort({ building: 1, floor: 1, name: 1 });

    res.json(halls);
  } catch (error) {
    console.error("Error fetching halls:", error);
    res.status(500).json({ message: "Server error fetching halls" });
  }
};

// @desc    Update an examination hall
// @route   PUT /api/exam-halls/:id
// @access  Private (HOD only)
export const updateHall = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, building, floor, rows, columns, facilities, isActive } = req.body;

    const hall = await ExamHall.findById(id);
    if (!hall) {
      return res.status(404).json({ message: "Examination hall not found" });
    }

    if (name !== undefined) hall.name = name.trim();
    if (building !== undefined) hall.building = building.trim();
    if (floor !== undefined) hall.floor = floor;
    if (rows !== undefined) hall.rows = rows;
    if (columns !== undefined) hall.columns = columns;
    if (facilities !== undefined) hall.facilities = facilities;
    if (isActive !== undefined) hall.isActive = isActive;

    // capacity is auto-calculated by the pre-save hook
    await hall.save();

    res.json({
      message: "Examination hall updated successfully",
      hall,
    });
  } catch (error) {
    console.error("Error updating hall:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "A hall with this name already exists in this building" });
    }
    res.status(500).json({ message: "Server error updating hall" });
  }
};

// @desc    Soft delete an examination hall (set isActive=false)
// @route   DELETE /api/exam-halls/:id
// @access  Private (HOD only)
export const deleteHall = async (req, res) => {
  try {
    const { id } = req.params;

    const hall = await ExamHall.findById(id);
    if (!hall) {
      return res.status(404).json({ message: "Examination hall not found" });
    }

    hall.isActive = false;
    await hall.save();

    res.json({ message: "Examination hall deactivated successfully" });
  } catch (error) {
    console.error("Error deleting hall:", error);
    res.status(500).json({ message: "Server error deleting hall" });
  }
};

// ─── Hall Allocation ─────────────────────────────────────────────────────────

// @desc    Auto-allocate students to halls for an exam
// @route   POST /api/hall-allocations/generate
// @access  Private (HOD only)
export const generateAllocation = async (req, res) => {
  try {
    const { examScheduleId, strategy, hallIds } = req.body;

    if (!examScheduleId) {
      return res.status(400).json({ message: "Exam schedule ID is required" });
    }

    // Fetch the exam schedule
    const examSchedule = await ExamSchedule.findById(examScheduleId);
    if (!examSchedule) {
      return res.status(404).json({ message: "Exam schedule not found" });
    }

    // Check if a non-archived allocation already exists for this exam
    const existingAllocation = await HallAllocation.findOne({
      examSchedule: examScheduleId,
      status: { $in: ["draft", "published"] },
    });
    if (existingAllocation) {
      return res.status(400).json({
        message: `An active allocation already exists for this exam (status: ${existingAllocation.status}). ` +
          `Use regenerate to create a new one, or archive the existing allocation first.`,
      });
    }

    // Fetch approved examination forms for this exam's course
    const approvedForms = await ExaminationForm.find({
      courseDept: examSchedule.course,
      status: "Approved",
    });

    if (approvedForms.length === 0) {
      return res.status(400).json({
        message: "No approved examination forms found for this course. Students must have approved exam forms.",
      });
    }

    // Get the student IDs from approved forms
    const studentIds = approvedForms.map((form) => form.student);

    // Fetch student details from User model
    const students = await User.find({
      _id: { $in: studentIds },
      role: "student",
    }).select("name studentId course department semester");

    if (students.length === 0) {
      return res.status(400).json({
        message: "No student records found for the approved examination forms.",
      });
    }

    // Fetch halls — specific ones if hallIds provided, otherwise all active
    let halls;
    if (hallIds && hallIds.length > 0) {
      halls = await ExamHall.find({ _id: { $in: hallIds }, isActive: true });
      if (halls.length === 0) {
        return res.status(400).json({ message: "None of the specified halls are active or exist." });
      }
      if (halls.length !== hallIds.length) {
        return res.status(400).json({
          message: "One or more selected halls are inactive or do not exist.",
        });
      }
    } else {
      halls = await ExamHall.find({ isActive: true });
      if (halls.length === 0) {
        return res.status(400).json({
          message: "No active examination halls available. Please create halls first.",
        });
      }
    }

    // Run allocation engine
    const allocationStrategy = strategy || "department-mixed";
    const result = allocateStudents(students, halls, allocationStrategy);

    // Validate allocation integrity
    const validation = validateAllocation(result);
    if (!validation.valid) {
      result.warnings.push(...validation.errors);
    }

    // Save allocation as draft
    const hallAllocation = await HallAllocation.create({
      examSchedule: examScheduleId,
      allocatedBy: req.user.id,
      strategy: allocationStrategy,
      status: "draft",
      totalStudents: result.totalStudents,
      totalHalls: result.totalHalls,
      allocations: result.allocations,
      warnings: result.warnings,
    });

    res.status(201).json({
      message: "Hall allocation generated successfully",
      allocation: hallAllocation,
    });
  } catch (error) {
    console.error("Error generating allocation:", error);
    res.status(500).json({ message: error.message || "Server error generating allocation" });
  }
};

// @desc    Get allocation for an exam schedule
// @route   GET /api/hall-allocations/:examScheduleId
// @access  Private (HOD, Teacher)
export const getAllocation = async (req, res) => {
  try {
    const { examScheduleId } = req.params;

    const allocation = await HallAllocation.findOne({
      examSchedule: examScheduleId,
      status: { $in: ["draft", "published"] },
    })
      .populate("allocatedBy", "name email")
      .populate("allocations.hall", "name building floor capacity");

    if (!allocation) {
      return res.status(404).json({ message: "No allocation found for this exam schedule" });
    }

    res.json(allocation);
  } catch (error) {
    console.error("Error fetching allocation:", error);
    res.status(500).json({ message: "Server error fetching allocation" });
  }
};

// @desc    Publish a draft allocation
// @route   PUT /api/hall-allocations/:id/publish
// @access  Private (HOD only)
export const publishAllocation = async (req, res) => {
  try {
    const { id } = req.params;

    const allocation = await HallAllocation.findById(id);
    if (!allocation) {
      return res.status(404).json({ message: "Allocation not found" });
    }

    if (allocation.status === "published") {
      return res.status(400).json({ message: "Allocation is already published" });
    }

    if (allocation.status === "archived") {
      return res.status(400).json({ message: "Cannot publish an archived allocation" });
    }

    allocation.status = "published";
    await allocation.save();

    res.json({
      message: "Allocation published successfully. Students can now view their seat assignments.",
      allocation,
    });
  } catch (error) {
    console.error("Error publishing allocation:", error);
    res.status(500).json({ message: "Server error publishing allocation" });
  }
};

// @desc    Manual seat swap within an allocation
// @route   PUT /api/hall-allocations/:id/seats
// @access  Private (HOD only)
export const updateSeats = async (req, res) => {
  try {
    const { id } = req.params;
    const { swaps } = req.body;

    if (!swaps || !Array.isArray(swaps) || swaps.length === 0) {
      return res.status(400).json({ message: "Swaps array is required" });
    }

    const allocation = await HallAllocation.findById(id);
    if (!allocation) {
      return res.status(404).json({ message: "Allocation not found" });
    }

    if (allocation.status === "archived") {
      return res.status(400).json({ message: "Cannot modify an archived allocation" });
    }

    const errors = [];

    for (const swap of swaps) {
      const { fromSeatNumber, toSeatNumber, fromHallId, toHallId } = swap;

      // Find the source hall group and seat
      const fromHallGroup = allocation.allocations.find(
        (a) => a.hall.toString() === fromHallId
      );
      if (!fromHallGroup) {
        errors.push(`Source hall ${fromHallId} not found in allocation`);
        continue;
      }

      const fromSeat = fromHallGroup.seats.find((s) => s.seatNumber === fromSeatNumber);
      if (!fromSeat) {
        errors.push(`Seat ${fromSeatNumber} not found in source hall`);
        continue;
      }

      // Find the target hall group and seat
      const toHallGroup = allocation.allocations.find(
        (a) => a.hall.toString() === toHallId
      );
      if (!toHallGroup) {
        errors.push(`Target hall ${toHallId} not found in allocation`);
        continue;
      }

      const toSeat = toHallGroup.seats.find((s) => s.seatNumber === toSeatNumber);
      if (!toSeat) {
        errors.push(`Seat ${toSeatNumber} not found in target hall`);
        continue;
      }

      // Swap student data between the two seats
      const tempStudent = fromSeat.student;
      const tempStudentName = fromSeat.studentName;
      const tempRollNumber = fromSeat.rollNumber;
      const tempDepartment = fromSeat.department;

      fromSeat.student = toSeat.student;
      fromSeat.studentName = toSeat.studentName;
      fromSeat.rollNumber = toSeat.rollNumber;
      fromSeat.department = toSeat.department;

      toSeat.student = tempStudent;
      toSeat.studentName = tempStudentName;
      toSeat.rollNumber = tempRollNumber;
      toSeat.department = tempDepartment;
    }

    if (errors.length > 0) {
      return res.status(400).json({ message: "Some swaps failed", errors });
    }

    await allocation.save();

    // Validate integrity after swap
    const validation = validateAllocation(allocation);
    const response = {
      message: "Seat swaps completed successfully",
      allocation,
    };
    if (!validation.valid) {
      response.warnings = validation.errors;
    }

    res.json(response);
  } catch (error) {
    console.error("Error updating seats:", error);
    res.status(500).json({ message: "Server error updating seats" });
  }
};

// @desc    Regenerate allocation (archive old, create new)
// @route   POST /api/hall-allocations/:id/regenerate
// @access  Private (HOD only)
export const regenerateAllocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { strategy, hallIds } = req.body;

    const oldAllocation = await HallAllocation.findById(id);
    if (!oldAllocation) {
      return res.status(404).json({ message: "Allocation not found" });
    }

    // Fetch the exam schedule
    const examSchedule = await ExamSchedule.findById(oldAllocation.examSchedule);
    if (!examSchedule) {
      return res.status(404).json({ message: "Associated exam schedule not found" });
    }

    // Fetch approved forms for this course
    const approvedForms = await ExaminationForm.find({
      courseDept: examSchedule.course,
      status: "Approved",
    });

    if (approvedForms.length === 0) {
      return res.status(400).json({
        message: "No approved examination forms found for this course.",
      });
    }

    const studentIds = approvedForms.map((form) => form.student);
    const students = await User.find({
      _id: { $in: studentIds },
      role: "student",
    }).select("name studentId course department semester");

    if (students.length === 0) {
      return res.status(400).json({
        message: "No student records found for the approved examination forms.",
      });
    }

    // Fetch halls
    let halls;
    if (hallIds && hallIds.length > 0) {
      halls = await ExamHall.find({ _id: { $in: hallIds }, isActive: true });
      if (halls.length !== hallIds.length) {
        return res.status(400).json({
          message: "One or more selected halls are inactive or do not exist.",
        });
      }
    } else {
      halls = await ExamHall.find({ isActive: true });
    }

    if (!halls || halls.length === 0) {
      return res.status(400).json({ message: "No active examination halls available." });
    }

    // Run allocation with new or same strategy
    const allocationStrategy = strategy || oldAllocation.strategy;
    const result = allocateStudents(students, halls, allocationStrategy);

    const validation = validateAllocation(result);
    if (!validation.valid) {
      result.warnings.push(...validation.errors);
    }

    oldAllocation.status = "archived";
    await oldAllocation.save();

    const newAllocation = await HallAllocation.create({
      examSchedule: oldAllocation.examSchedule,
      allocatedBy: req.user.id,
      strategy: allocationStrategy,
      status: "draft",
      totalStudents: result.totalStudents,
      totalHalls: result.totalHalls,
      allocations: result.allocations,
      warnings: result.warnings,
    });

    res.status(201).json({
      message: "Allocation regenerated successfully. Old allocation has been archived.",
      allocation: newAllocation,
    });
  } catch (error) {
    console.error("Error regenerating allocation:", error);
    res.status(500).json({ message: error.message || "Server error regenerating allocation" });
  }
};

// @desc    Export allocation as PDF
// @route   GET /api/hall-allocations/:id/export/pdf
// @access  Private (HOD, Teacher)
export const exportPDF = async (req, res) => {
  try {
    const allocation = await HallAllocation.findById(req.params.id);
    if (!allocation) return res.status(404).json({ message: "Allocation not found" });

    const examSchedule = await ExamSchedule.findById(allocation.examSchedule);

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=hall-allocation-${allocation._id}.pdf`);
    doc.pipe(res);

    // Title page
    doc.fontSize(24).font("Helvetica-Bold").text("Examination Hall Allocation Report", { align: "center" });
    doc.moveDown();
    doc.fontSize(14).font("Helvetica");
    if (examSchedule) {
      doc.text(`Exam: ${examSchedule.examName}`, { align: "center" });
      doc.text(`Course: ${examSchedule.course}`, { align: "center" });
      doc.text(`Date: ${examSchedule.examDate}`, { align: "center" });
      doc.text(`Time: ${examSchedule.startTime} - ${examSchedule.endTime}`, { align: "center" });
    }
    doc.moveDown();
    doc.text(`Strategy: ${allocation.strategy}`, { align: "center" });
    doc.text(`Total Students: ${allocation.totalStudents}`, { align: "center" });
    doc.text(`Total Halls: ${allocation.totalHalls}`, { align: "center" });

    // Per-hall pages
    for (const hallGroup of allocation.allocations) {
      doc.addPage();
      doc.fontSize(18).font("Helvetica-Bold").text(`Hall: ${hallGroup.hallName}`, { align: "center" });
      doc.moveDown();
      doc.fontSize(10).font("Helvetica");
      doc.text(`Total Seats Assigned: ${hallGroup.seats.length}`);
      doc.moveDown();

      // Table header
      const tableTop = doc.y;
      const col1 = 50, col2 = 130, col3 = 300, col4 = 420;
      doc.font("Helvetica-Bold");
      doc.text("Seat No", col1, tableTop);
      doc.text("Student Name", col2, tableTop);
      doc.text("Roll Number", col3, tableTop);
      doc.text("Department", col4, tableTop);
      doc.moveTo(col1, tableTop + 15).lineTo(530, tableTop + 15).stroke();

      let y = tableTop + 25;
      doc.font("Helvetica");
      for (const seat of hallGroup.seats) {
        if (y > 700) {
          doc.addPage();
          y = 50;
        }
        doc.text(seat.seatNumber, col1, y);
        doc.text(seat.studentName || "-", col2, y);
        doc.text(seat.rollNumber || "-", col3, y);
        doc.text(seat.department || "-", col4, y);
        y += 20;
      }
    }

    // Footer on last page
    doc.moveDown(2);
    doc.fontSize(8).fillColor("gray").text(
      `Generated on ${new Date().toLocaleString()} — Confidential: For Examination Use Only`,
      { align: "center" }
    );

    doc.end();
  } catch (error) {
    console.error("Error exporting PDF:", error);
    res.status(500).json({ message: "Failed to export PDF" });
  }
};

// @desc    Export allocation as CSV
// @route   GET /api/hall-allocations/:id/export/csv
// @access  Private (HOD, Teacher)
export const exportCSV = async (req, res) => {
  try {
    const allocation = await HallAllocation.findById(req.params.id);
    if (!allocation) {
      return res.status(404).json({ message: "Allocation not found" });
    }

    const { fields } = req.query;
    const allHeaders = ["Hall Name", "Seat Number", "Student Name", "Roll Number", "Department"];
    const selectedHeaders = fields ? fields.split(",").map(f => f.trim()) : allHeaders;
    const validHeaders = selectedHeaders.filter(h => allHeaders.includes(h));

    if (validHeaders.length === 0) {
      return res.status(400).json({ message: "No valid fields selected for export." });
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=hall-allocation-${allocation._id}.csv`);

    // CSV header
    const rows = [validHeaders.join(",")];

    for (const hallGroup of allocation.allocations) {
      for (const seat of hallGroup.seats) {
        // Map row data
        const rowData = {
          "Hall Name": `"${(hallGroup.hallName || "").replace(/"/g, '""')}"`,
          "Seat Number": seat.seatNumber,
          "Student Name": `"${(seat.studentName || "").replace(/"/g, '""')}"`,
          "Roll Number": `"${(seat.rollNumber || "").replace(/"/g, '""')}"`,
          "Department": `"${(seat.department || "").replace(/"/g, '""')}"`
        };

        const row = validHeaders.map(header => rowData[header]);
        rows.push(row.join(","));
      }
    }

    res.send(rows.join("\\n"));
  } catch (error) {
    console.error("Error exporting CSV:", error);
    res.status(500).json({ message: "Failed to export CSV" });
  }
};

// @desc    Student views their own seat assignment
// @route   GET /api/hall-allocations/student/my-seat
// @access  Private (Student only)
export const getStudentSeat = async (req, res) => {
  try {
    const studentId = req.user.id;

    // Find all published allocations where this student has a seat
    const allocations = await HallAllocation.find({
      status: "published",
      "allocations.seats.student": studentId,
    })
      .populate("examSchedule")
      .populate("allocations.hall", "name building floor capacity");

    if (!allocations || allocations.length === 0) {
      return res.status(404).json({
        message: "No seat assignments found. Your allocation may not be published yet.",
      });
    }

    // Extract the student's seat info from each allocation
    const seatAssignments = [];

    for (const allocation of allocations) {
      for (const hallGroup of allocation.allocations) {
        const studentSeat = hallGroup.seats.find(
          (s) => s.student.toString() === studentId
        );

        if (studentSeat) {
          seatAssignments.push({
            allocationId: allocation._id,
            examSchedule: allocation.examSchedule,
            hallName: hallGroup.hallName,
            hallId: hallGroup.hall,
            building: hallGroup.hall?.building,
            floor: hallGroup.hall?.floor,
            seatNumber: studentSeat.seatNumber,
            strategy: allocation.strategy,
          });
        }
      }
    }

    if (seatAssignments.length === 0) {
      return res.status(404).json({
        message: "No seat assignments found for your account.",
      });
    }

    res.json(seatAssignments);
  } catch (error) {
    console.error("Error fetching student seat:", error);
    res.status(500).json({ message: "Server error fetching seat assignment" });
  }
};
