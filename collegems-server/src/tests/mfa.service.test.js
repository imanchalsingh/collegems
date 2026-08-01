import assert from "node:assert/strict";
import test from "node:test";
import {
  generateTotpSecret,
  verifyTotpToken,
  generateRecoveryCodes,
  hashRecoveryCodes,
  consumeRecoveryCode,
  isMfaEnforcedForRole,
} from "../utils/mfa.service.js";
import speakeasy from "speakeasy";

test("mfa.service TOTP and recovery codes", async (t) => {
  await t.test("generates a verifiable TOTP secret", () => {
    const secret = generateTotpSecret("demo@college.edu");
    assert.ok(secret.base32);
    assert.ok(secret.otpauth_url?.includes("otpauth://"));

    const token = speakeasy.totp({
      secret: secret.base32,
      encoding: "base32",
    });
    assert.equal(verifyTotpToken(secret.base32, token), true);
    assert.equal(verifyTotpToken(secret.base32, "000000"), false);
  });

  await t.test("hashes and consumes single-use recovery codes", async () => {
    const codes = generateRecoveryCodes(8);
    assert.equal(codes.length, 8);
    assert.ok(codes.every((c) => /^\d{8}$/.test(c)));

    const user = { mfaRecoveryCodes: await hashRecoveryCodes(codes) };
    assert.equal(await consumeRecoveryCode(user, codes[0]), true);
    assert.ok(user.mfaRecoveryCodes[0].usedAt);
    assert.equal(await consumeRecoveryCode(user, codes[0]), false);
    assert.equal(await consumeRecoveryCode(user, codes[1]), true);
  });

  await t.test("respects MFA_ENFORCE_ROLES", () => {
    const previous = process.env.MFA_ENFORCE_ROLES;
    process.env.MFA_ENFORCE_ROLES = "hod,admin";
    assert.equal(isMfaEnforcedForRole("hod"), true);
    assert.equal(isMfaEnforcedForRole("admin"), true);
    assert.equal(isMfaEnforcedForRole("student"), false);
    process.env.MFA_ENFORCE_ROLES = previous;
  });
});
