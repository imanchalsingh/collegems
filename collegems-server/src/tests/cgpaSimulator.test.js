import test from "node:test";
import assert from "node:assert";

/**
 * Lightweight mirror of client cgpaSimulator math for server-side verification.
 * Keep in sync with collegems-client/src/utils/cgpaSimulator.ts
 */
const GRADE_POINTS = {
  "A+": 10,
  A: 9,
  "B+": 8,
  B: 7,
  "C+": 6,
  C: 5,
  D: 4,
  F: 0,
};

function percentageToGrade(pct) {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B+";
  if (pct >= 60) return "B";
  if (pct >= 50) return "C+";
  if (pct >= 40) return "C";
  if (pct >= 33) return "D";
  return "F";
}

function requiredPointsForTarget({
  targetCgpa,
  pastQualityPoints,
  pastCredits,
  otherSimQualityPoints,
  otherSimCredits,
  focusCredits,
}) {
  const denom = pastCredits + otherSimCredits + focusCredits;
  const requiredPoints =
    (targetCgpa * denom - pastQualityPoints - otherSimQualityPoints) / focusCredits;
  const projectedMax =
    (pastQualityPoints + otherSimQualityPoints + 10 * focusCredits) / denom;
  return {
    requiredPoints,
    achievable: requiredPoints <= 10 + 1e-9,
    projectedMax,
  };
}

test("CGPA simulator forecasting math", async (t) => {
  await t.test("maps percentage to grade points", () => {
    assert.strictEqual(GRADE_POINTS[percentageToGrade(85)], 9);
    assert.strictEqual(GRADE_POINTS[percentageToGrade(72)], 8);
  });

  await t.test("computes required focus points for target CGPA", () => {
    // past: 30 credits @ 8.0 QP avg => 240 QP
    // other sim: 6 credits @ 8 => 48 QP
    // focus: 4 credits; target 8.5 overall on 40 credits => need 340 QP total
    // required on focus = (340 - 240 - 48) / 4 = 13 → not achievable
    const hard = requiredPointsForTarget({
      targetCgpa: 8.5,
      pastQualityPoints: 240,
      pastCredits: 30,
      otherSimQualityPoints: 48,
      otherSimCredits: 6,
      focusCredits: 4,
    });
    assert.ok(hard.requiredPoints > 10);
    assert.strictEqual(hard.achievable, false);

    const easy = requiredPointsForTarget({
      targetCgpa: 8.0,
      pastQualityPoints: 240,
      pastCredits: 30,
      otherSimQualityPoints: 48,
      otherSimCredits: 6,
      focusCredits: 4,
    });
    // total credits 40, need 320 QP, have 288, need 32/4 = 8 points
    assert.ok(Math.abs(easy.requiredPoints - 8) < 1e-9);
    assert.strictEqual(easy.achievable, true);
  });
});
