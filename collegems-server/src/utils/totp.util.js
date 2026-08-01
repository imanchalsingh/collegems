import crypto from "crypto";

/** Classroom QR refreshes every 5 seconds (issue #710). */
export const TOTP_PERIOD_SECONDS = 5;
export const TOTP_DIGITS = 6;
/** Allow ±1 time window for clock skew / scan latency. */
export const TOTP_ALLOWED_DRIFT = 1;

/**
 * Generate a cryptographically random secret (hex) for a session.
 */
export function generateTotpSecret(bytes = 20) {
  return crypto.randomBytes(bytes).toString("hex");
}

function hotp(secretHex, counter, digits = TOTP_DIGITS) {
  const key = Buffer.from(secretHex, "hex");
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto.createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const mod = 10 ** digits;
  return String(code % mod).padStart(digits, "0");
}

export function getTimeCounter(nowMs = Date.now(), periodSeconds = TOTP_PERIOD_SECONDS) {
  return Math.floor(nowMs / 1000 / periodSeconds);
}

/**
 * Generate the current TOTP code for a secret.
 */
export function generateTotp(
  secretHex,
  nowMs = Date.now(),
  periodSeconds = TOTP_PERIOD_SECONDS,
  digits = TOTP_DIGITS
) {
  return hotp(secretHex, getTimeCounter(nowMs, periodSeconds), digits);
}

/**
 * Verify a TOTP code within ±allowedDrift windows.
 */
export function verifyTotp(
  secretHex,
  token,
  {
    nowMs = Date.now(),
    periodSeconds = TOTP_PERIOD_SECONDS,
    digits = TOTP_DIGITS,
    allowedDrift = TOTP_ALLOWED_DRIFT,
  } = {}
) {
  if (!token || typeof token !== "string") return false;
  const normalized = token.trim();
  const counter = getTimeCounter(nowMs, periodSeconds);

  for (let i = -allowedDrift; i <= allowedDrift; i++) {
    if (hotp(secretHex, counter + i, digits) === normalized) {
      return true;
    }
  }
  return false;
}

/**
 * Haversine distance in meters between two WGS84 coordinates.
 */
export function distanceMeters(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function isWithinGeofence(
  studentLat,
  studentLng,
  centerLat,
  centerLng,
  radiusMeters
) {
  if (
    [studentLat, studentLng, centerLat, centerLng, radiusMeters].some(
      (v) => typeof v !== "number" || Number.isNaN(v)
    )
  ) {
    return false;
  }
  return distanceMeters(studentLat, studentLng, centerLat, centerLng) <= radiusMeters;
}
