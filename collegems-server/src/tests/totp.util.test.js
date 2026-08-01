import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generateTotpSecret,
  generateTotp,
  verifyTotp,
  distanceMeters,
  isWithinGeofence,
  TOTP_PERIOD_SECONDS,
} from "../utils/totp.util.js";

describe("totp.util", () => {
  it("generates hex secrets", () => {
    const secret = generateTotpSecret();
    assert.equal(secret.length, 40);
    assert.match(secret, /^[0-9a-f]+$/);
  });

  it("verifies current TOTP within drift window", () => {
    const secret = generateTotpSecret();
    const now = Date.now();
    const code = generateTotp(secret, now);
    assert.equal(code.length, 6);
    assert.equal(verifyTotp(secret, code, { nowMs: now }), true);
    assert.equal(
      verifyTotp(secret, code, { nowMs: now + TOTP_PERIOD_SECONDS * 1000 }),
      true
    );
    assert.equal(
      verifyTotp(secret, "000000", { nowMs: now }),
      false
    );
  });

  it("computes geofence distance", () => {
    const d = distanceMeters(12.9716, 77.5946, 12.9716, 77.5946);
    assert.ok(d < 1);
    assert.equal(isWithinGeofence(12.9716, 77.5946, 12.9716, 77.5946, 50), true);
    assert.equal(isWithinGeofence(12.98, 77.6, 12.9716, 77.5946, 50), false);
  });
});
