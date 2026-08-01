import crypto from "crypto";
import fs from "fs";
import path from "path";

const KEY_DIR = path.join(process.cwd(), ".keys");
const PRIVATE_KEY_PATH = path.join(KEY_DIR, "transcript_signing_private.pem");
const PUBLIC_KEY_PATH = path.join(KEY_DIR, "transcript_signing_public.pem");

let cachedKeys = null;

/**
 * Stable canonical JSON for hashing (sorted keys, no whitespace variance).
 */
export function canonicalize(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalize(v)).join(",")}]`;
  }
  const keys = Object.keys(value).sort();
  const body = keys
    .map((k) => `${JSON.stringify(k)}:${canonicalize(value[k])}`)
    .join(",");
  return `{${body}}`;
}

export function sha256Hex(input) {
  const data = typeof input === "string" ? input : canonicalize(input);
  return crypto.createHash("sha256").update(data, "utf8").digest("hex");
}

/**
 * Build a SHA-256 Merkle tree over leaf payloads.
 * Returns { root, leaves, layers } where leaves are hex hashes.
 */
export function buildMerkleTree(leafValues) {
  if (!leafValues || leafValues.length === 0) {
    const empty = sha256Hex("");
    return { root: empty, leaves: [empty], layers: [[empty]] };
  }

  let layer = leafValues.map((v) => sha256Hex(v));
  const leaves = [...layer];
  const layers = [layer];

  while (layer.length > 1) {
    const next = [];
    for (let i = 0; i < layer.length; i += 2) {
      if (i + 1 < layer.length) {
        next.push(sha256Hex(layer[i] + layer[i + 1]));
      } else {
        // Odd leaf: hash with itself
        next.push(sha256Hex(layer[i] + layer[i]));
      }
    }
    layer = next;
    layers.push(layer);
  }

  return { root: layer[0], leaves, layers };
}

/**
 * Field-level Merkle leaves for a transcript / degree record.
 */
export function merkleLeavesFromRecord(record) {
  const orderedKeys = Object.keys(record || {}).sort();
  return orderedKeys.map((key) => ({
    key,
    value: record[key],
    leaf: { field: key, value: record[key] },
  }));
}

export function computeRecordMerkle(record) {
  const entries = merkleLeavesFromRecord(record);
  const tree = buildMerkleTree(entries.map((e) => e.leaf));
  return {
    merkleRoot: tree.root,
    leaves: tree.leaves,
    fields: entries.map((e, i) => ({
      field: e.key,
      leafHash: tree.leaves[i],
    })),
  };
}

function ensureKeyPair() {
  if (cachedKeys) return cachedKeys;

  const envPrivate = process.env.CERT_SIGNING_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const envPublic = process.env.CERT_SIGNING_PUBLIC_KEY?.replace(/\\n/g, "\n");

  if (envPrivate && envPublic) {
    cachedKeys = { privateKey: envPrivate, publicKey: envPublic, source: "env" };
    return cachedKeys;
  }

  try {
    if (fs.existsSync(PRIVATE_KEY_PATH) && fs.existsSync(PUBLIC_KEY_PATH)) {
      cachedKeys = {
        privateKey: fs.readFileSync(PRIVATE_KEY_PATH, "utf8"),
        publicKey: fs.readFileSync(PUBLIC_KEY_PATH, "utf8"),
        source: "file",
      };
      return cachedKeys;
    }
  } catch {
    // fall through to generate
  }

  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  try {
    if (!fs.existsSync(KEY_DIR)) fs.mkdirSync(KEY_DIR, { recursive: true });
    fs.writeFileSync(PRIVATE_KEY_PATH, privateKey, { mode: 0o600 });
    fs.writeFileSync(PUBLIC_KEY_PATH, publicKey);
  } catch (err) {
    console.warn("[cryptoSigner] Could not persist signing keys:", err.message);
  }

  cachedKeys = { privateKey, publicKey, source: "generated" };
  return cachedKeys;
}

export function getPublicKeyPem() {
  return ensureKeyPair().publicKey;
}

/**
 * Sign a Merkle root (or any hex/string digest) with the institution private key.
 */
export function signDigest(digestHex) {
  const { privateKey } = ensureKeyPair();
  const signature = crypto.sign("sha256", Buffer.from(digestHex, "utf8"), {
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
  });
  return signature.toString("base64");
}

export function verifySignature(digestHex, signatureBase64, publicKeyPem = null) {
  try {
    const publicKey = publicKeyPem || ensureKeyPair().publicKey;
    return crypto.verify(
      "sha256",
      Buffer.from(digestHex, "utf8"),
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      },
      Buffer.from(signatureBase64, "base64"),
    );
  } catch {
    return false;
  }
}

/**
 * Issue a full cryptographic seal for a transcript/degree payload.
 */
export function sealAcademicRecord(record) {
  const issuedAt = record.issuedAt || new Date().toISOString();
  const payload = { ...record, issuedAt };
  const { merkleRoot, fields, leaves } = computeRecordMerkle(payload);
  const recordHash = sha256Hex(payload);
  const signature = signDigest(merkleRoot);

  return {
    payload,
    recordHash,
    merkleRoot,
    signature,
    fields,
    leaves,
    algorithm: "SHA-256+RSA-PSS",
    publicKeyFingerprint: sha256Hex(getPublicKeyPem()).slice(0, 16),
  };
}

/**
 * Re-verify a stored seal; optionally detect field-level tampering vs claimedPayload.
 */
export function verifyAcademicSeal({
  payload,
  merkleRoot,
  signature,
  claimedPayload = null,
}) {
  const recomputed = computeRecordMerkle(payload);
  const merkleMatches = recomputed.merkleRoot === merkleRoot;
  const signatureValid = verifySignature(merkleRoot, signature);
  const recordHash = sha256Hex(payload);

  let tampered = false;
  let tamperedFields = [];

  if (claimedPayload && typeof claimedPayload === "object") {
    const claimed = computeRecordMerkle({ ...payload, ...claimedPayload });
    if (claimed.merkleRoot !== merkleRoot) {
      tampered = true;
      const originalKeys = new Set(Object.keys(payload || {}));
      const claimKeys = new Set([
        ...Object.keys(payload || {}),
        ...Object.keys(claimedPayload || {}),
      ]);
      for (const key of claimKeys) {
        if (canonicalize(payload?.[key]) !== canonicalize(claimedPayload?.[key] ?? payload?.[key])) {
          if (claimedPayload[key] !== undefined || originalKeys.has(key)) {
            if (canonicalize(payload?.[key]) !== canonicalize(claimedPayload[key])) {
              tamperedFields.push(key);
            }
          }
        }
      }
      // Compare field-by-field against original payload
      tamperedFields = [];
      for (const key of new Set([...Object.keys(payload || {}), ...Object.keys(claimedPayload)])) {
        if (canonicalize(payload?.[key]) !== canonicalize(claimedPayload?.[key])) {
          tamperedFields.push(key);
        }
      }
    }
  }

  const valid = merkleMatches && signatureValid && !tampered;

  return {
    valid,
    merkleMatches,
    signatureValid,
    tampered,
    tamperedFields,
    recordHash,
    merkleRoot,
    recomputedMerkleRoot: recomputed.merkleRoot,
    algorithm: "SHA-256+RSA-PSS",
  };
}
