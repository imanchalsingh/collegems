import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateEmiSchedule,
  calculateOverduePenalty,
  splitAmount,
  PLAN_TYPES,
} from "../utils/feeEmi.util.js";

test("splitAmount distributes remainder on last installment", () => {
  assert.deepEqual(splitAmount(10000, 3), [3333, 3333, 3334]);
  assert.deepEqual(splitAmount(12000, 12), Array(12).fill(1000));
});

test("calculateEmiSchedule supports all plan types", () => {
  const start = new Date("2026-08-01T00:00:00.000Z");
  for (const planType of PLAN_TYPES) {
    const schedule = calculateEmiSchedule({
      remainingAmount: 120000,
      planType,
      startDate: start,
    });
    assert.equal(schedule.planType, planType);
    const sum = schedule.installments.reduce((s, i) => s + i.amount, 0);
    assert.equal(sum, 120000);
    assert.equal(schedule.installments[0].sequence, 1);
    assert.ok(schedule.installments[0].dueDate instanceof Date);
  }
  assert.equal(
    calculateEmiSchedule({ remainingAmount: 100, planType: "2_stage", startDate: start })
      .count,
    2
  );
  assert.equal(
    calculateEmiSchedule({ remainingAmount: 100, planType: "4_stage", startDate: start })
      .count,
    4
  );
  assert.equal(
    calculateEmiSchedule({ remainingAmount: 100, planType: "monthly", startDate: start })
      .count,
    12
  );
});

test("calculateOverduePenalty respects grace period and cap", () => {
  const due = new Date("2026-07-01T00:00:00.000Z");
  const none = calculateOverduePenalty({
    installmentAmount: 10000,
    dueDate: due,
    gracePeriodDays: 7,
    asOf: new Date("2026-07-05T00:00:00.000Z"),
  });
  assert.equal(none.penalty, 0);

  const afterGrace = calculateOverduePenalty({
    installmentAmount: 10000,
    dueDate: due,
    gracePeriodDays: 7,
    dailyPercent: 2,
    maxPercent: 20,
    asOf: new Date("2026-07-12T00:00:00.000Z"), // 11 days past due → 4 past grace → 8%
  });
  assert.equal(afterGrace.penalty, 800);

  const capped = calculateOverduePenalty({
    installmentAmount: 10000,
    dueDate: due,
    gracePeriodDays: 0,
    dailyPercent: 2,
    maxPercent: 20,
    asOf: new Date("2026-08-20T00:00:00.000Z"),
  });
  assert.equal(capped.penalty, 2000);
});
