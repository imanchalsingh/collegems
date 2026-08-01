/** Client-side TOTP (HMAC-SHA1) matching server `totp.util.js` — 5s period. */

const PERIOD = 5;
const DIGITS = 6;

async function hmacSha1(keyHex: string, message: ArrayBuffer): Promise<ArrayBuffer> {
  const keyBytes = new Uint8Array(keyHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  return crypto.subtle.sign("HMAC", cryptoKey, message);
}

function counterBuffer(counter: number): ArrayBuffer {
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  // write as big-endian uint64 (high 32 + low 32)
  const high = Math.floor(counter / 2 ** 32);
  const low = counter >>> 0;
  view.setUint32(0, high);
  view.setUint32(4, low);
  return buf;
}

export async function generateClientTotp(
  secretHex: string,
  nowMs = Date.now(),
  periodSeconds = PERIOD
): Promise<string> {
  const counter = Math.floor(nowMs / 1000 / periodSeconds);
  const hmac = new Uint8Array(await hmacSha1(secretHex, counterBuffer(counter)));
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const mod = 10 ** DIGITS;
  return String(code % mod).padStart(DIGITS, "0");
}

export function msUntilNextWindow(nowMs = Date.now(), periodSeconds = PERIOD): number {
  const periodMs = periodSeconds * 1000;
  return periodMs - (nowMs % periodMs);
}

/** Stable-ish device fingerprint for anti-proxy checks (localStorage + UA). */
export function getOrCreateDeviceFingerprint(): string {
  const key = "collegems_device_fp";
  const existing = localStorage.getItem(key);
  if (existing) return existing;

  const raw = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    crypto.randomUUID(),
  ].join("|");

  // Simple hash → hex (sync)
  let h = 0;
  for (let i = 0; i < raw.length; i++) {
    h = (Math.imul(31, h) + raw.charCodeAt(i)) | 0;
  }
  const fp = `fp_${Math.abs(h).toString(16)}_${raw.length.toString(16)}`;
  localStorage.setItem(key, fp);
  return fp;
}
