import crypto from "crypto";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { hashPassword, comparePassword } from "./hashPassword.js";

const ISSUER = process.env.MFA_ISSUER || "CollegeMS";
const RECOVERY_CODE_COUNT = 8;

export function getEnforcedMfaRoles() {
  const raw = process.env.MFA_ENFORCE_ROLES || "hod,admin";
  return raw
    .split(",")
    .map((r) => r.trim().toLowerCase())
    .filter(Boolean);
}

export function isMfaEnforcedForRole(role) {
  if (!role) return false;
  return getEnforcedMfaRoles().includes(String(role).toLowerCase());
}

export function generateTotpSecret(email) {
  return speakeasy.generateSecret({
    name: `${ISSUER} (${email})`,
    issuer: ISSUER,
    length: 32,
  });
}

export async function buildQrDataUrl(otpauthUrl) {
  return QRCode.toDataURL(otpauthUrl);
}

export function verifyTotpToken(secret, token) {
  if (!secret || !token) return false;
  return speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token: String(token).replace(/\s/g, ""),
    window: 1,
  });
}

export function generateRecoveryCodes(count = RECOVERY_CODE_COUNT) {
  const codes = [];
  for (let i = 0; i < count; i += 1) {
    const n = crypto.randomInt(0, 100_000_000);
    codes.push(String(n).padStart(8, "0"));
  }
  return codes;
}

export async function hashRecoveryCodes(codes) {
  const hashed = [];
  for (const code of codes) {
    hashed.push({
      hash: await hashPassword(code, 8),
      usedAt: null,
    });
  }
  return hashed;
}

export async function consumeRecoveryCode(user, plainCode) {
  const normalized = String(plainCode || "").replace(/\s|-/g, "");
  if (!normalized || !Array.isArray(user.mfaRecoveryCodes)) {
    return false;
  }

  for (const entry of user.mfaRecoveryCodes) {
    if (entry.usedAt) continue;
    const match = await comparePassword(normalized, entry.hash);
    if (match) {
      entry.usedAt = new Date();
      return true;
    }
  }
  return false;
}

export function remainingRecoveryCodes(user) {
  if (!Array.isArray(user.mfaRecoveryCodes)) return 0;
  return user.mfaRecoveryCodes.filter((c) => !c.usedAt).length;
}
