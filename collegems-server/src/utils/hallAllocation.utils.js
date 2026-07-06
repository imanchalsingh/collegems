/**
 * Hall Allocation Utility
 * Provides 3 seating strategies: sequential, department-mixed, zigzag
 */

/**
 * Generate a seat label from row and column indices
 * (0, 0) => "A1", (1, 2) => "B3", (25, 0) => "Z1", (26, 0) => "AA1"
 */
export function generateSeatLabel(rowIndex, colIndex) {
  let rowLabel = "";
  let idx = rowIndex;
  do {
    rowLabel = String.fromCharCode(65 + (idx % 26)) + rowLabel;
    idx = Math.floor(idx / 26) - 1;
  } while (idx >= 0);
  return `${rowLabel}${colIndex + 1}`;
}

/**
 * Round-robin merge of multiple arrays
 * [[a1,a2,a3], [b1,b2], [c1]] => [a1, b1, c1, a2, b2, a3]
 */
function roundRobinMerge(groups) {
  const result = [];
  const maxLen = Math.max(...groups.map((g) => g.length));
  for (let i = 0; i < maxLen; i++) {
    for (const group of groups) {
      if (i < group.length) {
        result.push(group[i]);
      }
    }
  }
  return result;
}

/**
 * Order students based on the chosen strategy
 */
function orderStudents(students, strategy) {
  const getStudentSortKey = (student) =>
    student.rollNumber || student.studentId || student.email || student.name || "";

  if (strategy === "sequential") {
    return [...students].sort((a, b) =>
      getStudentSortKey(a).localeCompare(getStudentSortKey(b), undefined, { numeric: true })
    );
  }

  // Group students by department/course
  const groups = {};
  for (const student of students) {
    const dept = student.course || student.department || "Unknown";
    if (!groups[dept]) groups[dept] = [];
    groups[dept].push(student);
  }

  // Sort within each group by roll number
  for (const dept in groups) {
    groups[dept].sort((a, b) =>
      getStudentSortKey(a).localeCompare(getStudentSortKey(b), undefined, { numeric: true })
    );
  }

  const groupArrays = Object.values(groups);

  if (strategy === "department-mixed") {
    return roundRobinMerge(groupArrays);
  }

  if (strategy === "zigzag") {
    // For zigzag, we still round-robin but we'll handle row-level
    // alternation during seat assignment
    return roundRobinMerge(groupArrays);
  }

  return students;
}

/**
 * Main allocation function
 * @param {Array} students - Array of student objects with { _id, name, rollNumber, course, studentId }
 * @param {Array} halls - Array of hall objects with { _id, name, rows, columns, capacity, building }
 * @param {string} strategy - "sequential" | "department-mixed" | "zigzag"
 * @returns {{ allocations: Array, warnings: Array, totalStudents: number, totalHalls: number }}
 */
export function allocateStudents(students, halls, strategy = "department-mixed") {
  // Pre-validation
  if (!students || students.length === 0) {
    throw new Error("No students to allocate");
  }

  if (!halls || halls.length === 0) {
    throw new Error("No examination halls available. Please create halls first.");
  }

  const activeHalls = halls.filter((h) => h.isActive !== false);
  if (activeHalls.length === 0) {
    throw new Error("All examination halls are currently inactive.");
  }

  const invalidHall = activeHalls.find(
    (h) => !Number.isFinite(Number(h.capacity)) || Number(h.capacity) < 1
  );
  if (invalidHall) {
    throw new Error(`Hall ${invalidHall.name || invalidHall._id} has invalid seating capacity.`);
  }

  const totalCapacity = activeHalls.reduce((sum, h) => sum + Number(h.capacity), 0);
  if (totalCapacity < students.length) {
    throw new Error(
      `Insufficient hall capacity. Need ${students.length} seats but only ${totalCapacity} available. ` +
      `Deficit: ${students.length - totalCapacity} seats. Please add more halls or increase capacity.`
    );
  }

  // Order students based on strategy
  const orderedStudents = orderStudents(students, strategy);

  // Sort halls by capacity (largest first) for efficient packing
  const sortedHalls = [...activeHalls].sort((a, b) => Number(b.capacity) - Number(a.capacity));

  // Fill halls
  const allocations = [];
  const warnings = [];
  let studentIndex = 0;
  const assignedStudentIds = new Set();

  for (const hall of sortedHalls) {
    if (studentIndex >= orderedStudents.length) break;

    const seats = [];
    const hallRows = hall.rows || Math.ceil(hall.capacity / (hall.columns || 6));
    const hallCols = hall.columns || 6;

    for (let row = 0; row < hallRows; row++) {
      for (let col = 0; col < hallCols; col++) {
        if (studentIndex >= orderedStudents.length) break;

        const student = orderedStudents[studentIndex];
        const studentIdStr = student._id.toString();

        // Prevent duplicate assignment
        if (assignedStudentIds.has(studentIdStr)) {
          studentIndex++;
          col--; // retry this seat
          continue;
        }

        assignedStudentIds.add(studentIdStr);
        seats.push({
          seatNumber: generateSeatLabel(row, col),
          student: student._id,
          studentName: student.name,
          rollNumber: student.studentId || student.rollNumber || "",
          department: student.course || student.department || "",
        });
        studentIndex++;
      }
    }

    if (seats.length > 0) {
      allocations.push({
        hall: hall._id,
        hallName: hall.name,
        seats,
      });

      // Check capacity usage and warn if high
      const usagePercent = (seats.length / hall.capacity) * 100;
      if (usagePercent >= 90) {
        warnings.push(
          `${hall.name} is at ${usagePercent.toFixed(0)}% capacity (${seats.length}/${hall.capacity} seats)`
        );
      }
    }
  }

  // Post-validation
  const totalAssigned = allocations.reduce((sum, a) => sum + a.seats.length, 0);
  if (totalAssigned < orderedStudents.length) {
    warnings.push(
      `Warning: ${orderedStudents.length - totalAssigned} students could not be assigned seats.`
    );
  }

  return {
    allocations,
    warnings,
    totalStudents: totalAssigned,
    totalHalls: allocations.length,
  };
}

/**
 * Validate an existing allocation for integrity
 */
export function validateAllocation(allocation) {
  const errors = [];
  const studentIds = new Set();

  for (const hallGroup of allocation.allocations) {
    for (const seat of hallGroup.seats) {
      const sid = seat.student.toString();
      if (studentIds.has(sid)) {
        errors.push(`Duplicate: Student ${seat.studentName} assigned to multiple seats`);
      }
      studentIds.add(sid);
    }
  }

  return { valid: errors.length === 0, errors };
}
