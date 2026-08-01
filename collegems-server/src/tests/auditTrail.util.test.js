import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { flattenDelta, sanitizeDoc } from "../plugins/auditTrailPlugin.js";
import * as jsondiffpatch from "jsondiffpatch";

describe("auditTrailPlugin helpers", () => {
  it("flattens added / modified / deleted field diffs", () => {
    const before = { grade: "B", totalMarks: 70, note: "keep" };
    const after = { grade: "A", totalMarks: 70, bonus: 5 };
    const delta = jsondiffpatch.diff(before, after);
    const rows = flattenDelta(delta);

    const byPath = Object.fromEntries(rows.map((r) => [r.path, r]));
    assert.equal(byPath.grade.type, "modified");
    assert.equal(byPath.grade.oldValue, "B");
    assert.equal(byPath.grade.newValue, "A");
    assert.equal(byPath.bonus.type, "added");
    assert.equal(byPath.note.type, "deleted");
  });

  it("sanitizes mongoose-like documents", () => {
    const cleaned = sanitizeDoc({
      _id: "abc",
      name: "Test",
      __v: 1,
      constructor: {},
    });
    assert.equal(cleaned.name, "Test");
    assert.equal(Object.hasOwn(cleaned, "__v"), false);
    assert.equal(Object.hasOwn(cleaned, "constructor"), false);
  });
});
