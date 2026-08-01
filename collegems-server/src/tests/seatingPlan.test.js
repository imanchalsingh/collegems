import test from "node:test";
import assert from "node:assert";
import {
  allocateAntiCheatSeating,
  countSideBySideViolations,
  courseKey,
  generateSeatLabel,
  validateNoSideBySideSameCourse,
} from "../utils/seatingPlan.utils.js";

test("seating plan anti-cheat utilities", async (t) => {
  await t.test("generateSeatLabel uses row letters and 1-based columns", () => {
    assert.strictEqual(generateSeatLabel(0, 0), "A1");
    assert.strictEqual(generateSeatLabel(1, 2), "B3");
  });

  await t.test("interleaves courses so neighbors differ when diversity allows", () => {
    const students = [];
    for (let i = 0; i < 6; i++) {
      students.push({
        _id: `cs-${i}`,
        name: `CS Student ${i}`,
        studentId: `CS${i}`,
        course: "Computer Science",
      });
    }
    for (let i = 0; i < 6; i++) {
      students.push({
        _id: `ee-${i}`,
        name: `EE Student ${i}`,
        studentId: `EE${i}`,
        course: "Electrical Engineering",
      });
    }

    const halls = [
      {
        _id: "hall-1",
        name: "Hall A",
        building: "Main",
        floor: 1,
        rows: 3,
        columns: 4,
        capacity: 12,
        isActive: true,
      },
    ];

    const result = allocateAntiCheatSeating(students, halls);
    assert.strictEqual(result.totalStudents, 12);
    assert.strictEqual(result.strategy, "anti-cheat-interleaved");
    assert.strictEqual(result.adjacencyViolations, 0);

    const seats = result.allocations[0].seats;
    const grid = Array.from({ length: 3 }, () => Array(4).fill(null));
    for (const seat of seats) {
      grid[seat.row][seat.col] = { course: seat.department, department: seat.department };
    }
    assert.strictEqual(countSideBySideViolations(grid), 0);

    const validation = validateNoSideBySideSameCourse(result.allocations);
    assert.strictEqual(validation.valid, true);
  });

  await t.test("honors layout overrides for dynamic rows x columns", () => {
    const students = Array.from({ length: 6 }, (_, i) => ({
      _id: `s-${i}`,
      name: `Student ${i}`,
      studentId: `R${i}`,
      course: i % 2 === 0 ? "Math" : "Physics",
    }));

    const halls = [
      {
        _id: "hall-2",
        name: "Hall B",
        building: "Annex",
        rows: 10,
        columns: 10,
        capacity: 100,
        isActive: true,
      },
    ];

    const result = allocateAntiCheatSeating(students, halls, {
      "hall-2": { rows: 2, columns: 3 },
    });

    assert.strictEqual(result.totalStudents, 6);
    assert.strictEqual(result.layoutMeta["hall-2"].rows, 2);
    assert.strictEqual(result.layoutMeta["hall-2"].columns, 3);
    assert.ok(students.every((s) => courseKey(s)));
  });
});
