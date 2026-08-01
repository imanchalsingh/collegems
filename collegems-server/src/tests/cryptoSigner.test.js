import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMerkleTree,
  computeRecordMerkle,
  sealAcademicRecord,
  verifyAcademicSeal,
  sha256Hex,
  canonicalize,
} from "../utils/cryptoSigner.js";

test("cryptoSigner merkle and signatures", async (t) => {
  await t.test("canonicalize is key-order independent", () => {
    assert.equal(
      canonicalize({ b: 1, a: 2 }),
      canonicalize({ a: 2, b: 1 }),
    );
  });

  await t.test("merkle root is deterministic", () => {
    const a = buildMerkleTree([{ field: "x", value: 1 }, { field: "y", value: 2 }]);
    const b = buildMerkleTree([{ field: "x", value: 1 }, { field: "y", value: 2 }]);
    assert.equal(a.root, b.root);
    assert.match(a.root, /^[a-f0-9]{64}$/);
  });

  await t.test("seal verifies and detects tampering", () => {
    const record = {
      certId: "CMS-TEST",
      studentId: "S001",
      studentName: "Ada Lovelace",
      course: "B.Tech CSE",
      cgpa: "9.1",
      grades: [{ subject: "Algorithms", grade: "A", credits: 4 }],
      issuedAt: "2026-01-01T00:00:00.000Z",
    };

    const seal = sealAcademicRecord(record);
    assert.ok(seal.merkleRoot);
    assert.ok(seal.signature);
    assert.equal(seal.recordHash, sha256Hex(seal.payload));

    const ok = verifyAcademicSeal({
      payload: seal.payload,
      merkleRoot: seal.merkleRoot,
      signature: seal.signature,
    });
    assert.equal(ok.valid, true);
    assert.equal(ok.signatureValid, true);
    assert.equal(ok.merkleMatches, true);

    const tampered = verifyAcademicSeal({
      payload: seal.payload,
      merkleRoot: seal.merkleRoot,
      signature: seal.signature,
      claimedPayload: { ...seal.payload, cgpa: "10.0" },
    });
    assert.equal(tampered.valid, false);
    assert.equal(tampered.tampered, true);
    assert.ok(tampered.tamperedFields.includes("cgpa"));
  });

  await t.test("field merkle changes when a grade changes", () => {
    const base = computeRecordMerkle({ a: 1, b: 2 });
    const changed = computeRecordMerkle({ a: 1, b: 3 });
    assert.notEqual(base.merkleRoot, changed.merkleRoot);
  });
});
