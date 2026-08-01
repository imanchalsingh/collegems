import test from "node:test";
import assert from "node:assert";
import { expandAvailabilityWindows } from "../controllers/mentorshipBooking.controller.js";

test("mentorship availability expansion", async (t) => {
  await t.test("creates future slots from weekly windows and skips conflicts", () => {
    const monday = new Date();
    // move to next Monday
    const day = monday.getDay();
    const add = day === 1 ? 7 : (8 - day) % 7 || 7;
    monday.setDate(monday.getDate() + add);
    monday.setHours(0, 0, 0, 0);

    const from = new Date(monday);
    const to = new Date(monday);
    to.setHours(23, 59, 59, 999);

    const availability = {
      isActive: true,
      slotDurationMin: 60,
      slots: [
        {
          day: "Monday",
          startTime: "10:00",
          endTime: "12:00",
          location: "Lab 1",
          isOnline: false,
        },
      ],
    };

    const conflictStart = new Date(monday);
    conflictStart.setHours(10, 0, 0, 0);
    const conflictEnd = new Date(monday);
    conflictEnd.setHours(11, 0, 0, 0);

    const free = expandAvailabilityWindows(availability, from, to, []);
    assert.strictEqual(free.length, 2);

    const withConflict = expandAvailabilityWindows(availability, from, to, [
      { status: "confirmed", startTime: conflictStart, endTime: conflictEnd },
    ]);
    assert.strictEqual(withConflict.length, 1);
    assert.strictEqual(new Date(withConflict[0].startTime).getHours(), 11);
  });
});
