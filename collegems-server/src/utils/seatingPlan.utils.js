/**
 * Anti-cheating interleaved seating plan utilities.
 * Ensures students from the same course/department are not seated side-by-side.
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

export function courseKey(student) {
  return (student.course || student.department || "Unknown").trim() || "Unknown";
}

/**
 * Count horizontal (side-by-side) same-course adjacencies in a filled grid.
 */
export function countSideBySideViolations(grid) {
  let violations = 0;
  for (let r = 0; r < grid.length; r++) {
    for (let c = 1; c < grid[r].length; c++) {
      const left = grid[r][c - 1];
      const right = grid[r][c];
      if (left && right && courseKey(left) === courseKey(right)) {
        violations += 1;
      }
    }
  }
  return violations;
}

/**
 * Build round-robin queues keyed by course for interleaved placement.
 */
function buildCourseQueues(students) {
  const groups = {};
  for (const student of students) {
    const key = courseKey(student);
    if (!groups[key]) groups[key] = [];
    groups[key].push(student);
  }

  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => {
      const ka = a.studentId || a.rollNumber || a.name || "";
      const kb = b.studentId || b.rollNumber || b.name || "";
      return String(ka).localeCompare(String(kb), undefined, { numeric: true });
    });
  }

  return groups;
}

function pickStudent(queues, forbiddenCourse) {
  const keys = Object.keys(queues).filter((k) => queues[k].length > 0);
  if (keys.length === 0) return null;

  // Prefer any course different from left neighbor
  const preferred = keys.filter((k) => k !== forbiddenCourse);
  const pool = preferred.length > 0 ? preferred : keys;

  // Prefer the largest remaining queue among candidates (better mixing)
  pool.sort((a, b) => queues[b].length - queues[a].length || a.localeCompare(b));
  const chosenKey = pool[0];
  return queues[chosenKey].shift();
}

/**
 * Allocate seats with anti-cheat interleaving across hall grids.
 * @param {Array} students
 * @param {Array} halls - { _id, name, rows, columns, capacity, building, floor, isActive }
 * @param {Object} layoutOverrides - optional { [hallId]: { rows, columns } }
 */
export function allocateAntiCheatSeating(students, halls, layoutOverrides = {}) {
  if (!students?.length) {
    throw new Error("No students to allocate");
  }
  if (!halls?.length) {
    throw new Error("No examination halls available. Please create halls first.");
  }

  const activeHalls = halls.filter((h) => h.isActive !== false);
  if (!activeHalls.length) {
    throw new Error("All examination halls are currently inactive.");
  }

  const preparedHalls = activeHalls.map((hall) => {
    const override = layoutOverrides[hall._id?.toString?.() || hall._id] || {};
    const rows = Number(override.rows ?? hall.rows) || 1;
    const columns = Number(override.columns ?? hall.columns) || 1;
    if (rows < 1 || columns < 1) {
      throw new Error(`Hall ${hall.name} has invalid layout dimensions.`);
    }
    return {
      ...hall.toObject?.() ?? hall,
      rows,
      columns,
      capacity: rows * columns,
    };
  });

  const totalCapacity = preparedHalls.reduce((sum, h) => sum + h.capacity, 0);
  if (totalCapacity < students.length) {
    throw new Error(
      `Insufficient hall capacity. Need ${students.length} seats but only ${totalCapacity} available.`
    );
  }

  const queues = buildCourseQueues(students);
  const sortedHalls = [...preparedHalls].sort((a, b) => b.capacity - a.capacity);
  const allocations = [];
  const warnings = [];
  let remaining = students.length;
  let forcedSameCourse = 0;

  for (const hall of sortedHalls) {
    if (remaining <= 0) break;

    const grid = Array.from({ length: hall.rows }, () =>
      Array.from({ length: hall.columns }, () => null)
    );
    const seats = [];

    for (let row = 0; row < hall.rows; row++) {
      for (let col = 0; col < hall.columns; col++) {
        if (remaining <= 0) break;

        const leftNeighbor = col > 0 ? grid[row][col - 1] : null;
        const forbidden = leftNeighbor ? courseKey(leftNeighbor) : null;
        const beforeKeys = Object.keys(queues).filter((k) => queues[k].length > 0);
        const canAvoid =
          forbidden && beforeKeys.some((k) => k !== forbidden && queues[k].length > 0);

        const student = pickStudent(queues, forbidden);
        if (!student) break;

        if (forbidden && courseKey(student) === forbidden) {
          forcedSameCourse += 1;
        } else if (forbidden && !canAvoid) {
          // no alternate course available — unavoidable
        }

        grid[row][col] = student;
        seats.push({
          seatNumber: generateSeatLabel(row, col),
          row,
          col,
          student: student._id,
          studentName: student.name,
          rollNumber: student.studentId || student.rollNumber || "",
          department: courseKey(student),
        });
        remaining -= 1;
      }
    }

    const violations = countSideBySideViolations(grid);
    if (violations > 0) {
      warnings.push(
        `${hall.name}: ${violations} side-by-side same-course pair(s) could not be avoided (limited course diversity).`
      );
    }

    if (seats.length > 0) {
      allocations.push({
        hall: hall._id,
        hallName: hall.name,
        building: hall.building,
        floor: hall.floor ?? 0,
        rows: hall.rows,
        columns: hall.columns,
        seats,
        gridPreview: seats.map((s) => ({
          seatNumber: s.seatNumber,
          row: s.row,
          col: s.col,
          department: s.department,
          studentName: s.studentName,
          rollNumber: s.rollNumber,
        })),
      });
    }
  }

  if (forcedSameCourse > 0) {
    warnings.push(
      `${forcedSameCourse} seat(s) required placing same-course neighbors because not enough distinct courses remained.`
    );
  }

  if (remaining > 0) {
    warnings.push(`${remaining} student(s) could not be assigned seats.`);
  }

  const totalStudents = allocations.reduce((sum, a) => sum + a.seats.length, 0);

  return {
    allocations: allocations.map((a) => ({
      hall: a.hall,
      hallName: a.hallName,
      seats: a.seats,
    })),
    layoutMeta: Object.fromEntries(
      allocations.map((a) => [
        String(a.hall),
        {
          building: a.building,
          floor: a.floor,
          rows: a.rows,
          columns: a.columns,
          gridPreview: a.gridPreview,
        },
      ])
    ),
    warnings,
    totalStudents,
    totalHalls: allocations.length,
    strategy: "anti-cheat-interleaved",
    adjacencyViolations: allocations.reduce((sum, a) => {
      const g = Array.from({ length: a.rows }, () =>
        Array.from({ length: a.columns }, () => null)
      );
      for (const s of a.seats) {
        g[s.row][s.col] = { course: s.department, department: s.department };
      }
      return sum + countSideBySideViolations(g);
    }, 0),
  };
}

export function validateNoSideBySideSameCourse(allocations) {
  const errors = [];
  for (const hallGroup of allocations) {
    const bySeat = new Map(hallGroup.seats.map((s) => [s.seatNumber, s]));
    for (const seat of hallGroup.seats) {
      // Parse label like A1, B3 — check previous column same row
      const match = /^([A-Z]+)(\d+)$/.exec(seat.seatNumber);
      if (!match) continue;
      const col = Number(match[2]);
      if (col <= 1) continue;
      const leftLabel = `${match[1]}${col - 1}`;
      const left = bySeat.get(leftLabel);
      if (left && left.department && seat.department && left.department === seat.department) {
        errors.push(
          `${hallGroup.hallName}: ${leftLabel} and ${seat.seatNumber} share course ${seat.department}`
        );
      }
    }
  }
  return { valid: errors.length === 0, errors };
}
