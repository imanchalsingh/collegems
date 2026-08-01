import test from "node:test";
import assert from "node:assert";
import { calculateChargeableDays, FINE_PER_DAY } from "../utils/libraryFineEngine.js";

test("library fine engine excludes weekends and holidays", async (t) => {
  await t.test("skips Saturday and Sunday", () => {
    // Due Friday Jan 2 2026; as-of Monday Jan 5 2026
    // Chargeable: Sat 3 (skip), Sun 4 (skip), Mon 5 (count) => 1
    const due = new Date("2026-01-02T00:00:00");
    const asOf = new Date("2026-01-05T00:00:00");
    assert.strictEqual(calculateChargeableDays(due, asOf, []), 1);
  });

  await t.test("skips institutional holidays", () => {
    // Due Mon Jan 5; as-of Wed Jan 7; holiday Tue Jan 6
    // Chargeable: Tue (holiday skip), Wed (count) => 1
    const due = new Date("2026-01-05T00:00:00");
    const asOf = new Date("2026-01-07T00:00:00");
    const holidays = [new Date("2026-01-06T00:00:00")];
    assert.strictEqual(calculateChargeableDays(due, asOf, holidays), 1);
    assert.strictEqual(FINE_PER_DAY, 10);
  });
});
