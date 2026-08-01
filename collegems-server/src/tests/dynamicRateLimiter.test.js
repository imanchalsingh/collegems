import test from "node:test";
import assert from "node:assert";
import {
  RATE_TIERS,
  getSecurityMetrics,
  isIpBanned,
  unbanIp,
  recordRateLimitViolation,
  __resetRateLimitStateForTests,
} from "../middlewares/dynamicRateLimiter.js";

test("role-based rate limit metrics and auto-ban", async (t) => {
  t.beforeEach(() => {
    __resetRateLimitStateForTests();
  });

  await t.test("exposes expected tier defaults from issue #715", () => {
    assert.strictEqual(RATE_TIERS.public, 10);
    assert.strictEqual(RATE_TIERS.student, 100);
    assert.strictEqual(RATE_TIERS.hod, 300);
    assert.strictEqual(RATE_TIERS.admin, 300);
    assert.strictEqual(RATE_TIERS.ml, 15);
  });

  await t.test("auto-bans IP after repeated violations", () => {
    const req = {
      ip: "203.0.113.50",
      headers: {},
      user: { role: "student", id: "u1" },
      originalUrl: "/api/dashboard",
      method: "GET",
    };

    const threshold = getSecurityMetrics().banThreshold;
    for (let i = 0; i < threshold; i++) {
      recordRateLimitViolation(req, "student");
    }

    assert.strictEqual(isIpBanned("203.0.113.50"), true);
    const metrics = getSecurityMetrics();
    assert.ok(metrics.banEvents >= 1);
    assert.ok(metrics.blockedRequests >= threshold);
    assert.ok(metrics.bannedIps.some((b) => b.ip === "203.0.113.50"));
    assert.ok(metrics.recentViolations.length >= 1);
  });

  await t.test("unban removes IP from ban list", () => {
    const req = {
      ip: "198.51.100.9",
      headers: {},
      user: { role: "anonymous" },
      originalUrl: "/api/auth/login",
      method: "POST",
    };
    const threshold = getSecurityMetrics().banThreshold;
    for (let i = 0; i < threshold; i++) {
      recordRateLimitViolation(req, "public");
    }
    assert.strictEqual(isIpBanned("198.51.100.9"), true);
    assert.strictEqual(unbanIp("198.51.100.9"), true);
    assert.strictEqual(isIpBanned("198.51.100.9"), false);
  });
});
