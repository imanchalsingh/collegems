import * as jsondiffpatch from "jsondiffpatch";
import httpContext from "express-http-context";
import RecordSnapshot from "../models/RecordSnapshot.model.js";

const differ = jsondiffpatch.create({
  objectHash: (obj) =>
    obj && (obj._id?.toString?.() || obj.id || obj.key || JSON.stringify(obj)),
  arrays: { detectMove: true },
  textDiff: { minLength: 80 },
});

const INTERNAL_KEYS = new Set([
  "__v",
  "constructor",
  "$__",
  "$isNew",
  "_doc",
  "_updatedBy",
]);

/**
 * Normalize a mongoose doc / lean object for stable JSON diffs.
 */
export function sanitizeDoc(doc) {
  if (!doc) return null;
  const raw = doc.toObject ? doc.toObject({ depopulate: true }) : { ...doc };
  const cleaned = JSON.parse(
    JSON.stringify(raw, (_key, value) => {
      if (value && typeof value === "object" && value._bsontype === "ObjectID") {
        return value.toString();
      }
      return value;
    })
  );

  for (const key of INTERNAL_KEYS) {
    delete cleaned[key];
  }
  return cleaned;
}

/**
 * Flatten jsondiffpatch delta into side-by-side field rows for the UI.
 * Red = deleted/old, Green = added/new.
 */
export function flattenDelta(delta, prefix = "") {
  if (!delta || typeof delta !== "object") return [];

  const rows = [];

  for (const [key, change] of Object.entries(delta)) {
    if (key === "_t") continue;
    const path = prefix ? `${prefix}.${key}` : key;

    if (Array.isArray(change)) {
      if (change.length === 1) {
        rows.push({ path, type: "added", oldValue: undefined, newValue: change[0] });
      } else if (change.length === 2) {
        rows.push({ path, type: "modified", oldValue: change[0], newValue: change[1] });
      } else if (change.length === 3 && change[2] === 0) {
        rows.push({ path, type: "deleted", oldValue: change[0], newValue: undefined });
      }
      continue;
    }

    if (change && typeof change === "object") {
      rows.push(...flattenDelta(change, path));
    }
  }

  return rows;
}

function readAuditContext(options = {}) {
  const ctx = httpContext.get("auditContext") || {};
  return {
    editorId: options.editorId || ctx.userId || options._updatedBy,
    actorRole: options.actorRole || ctx.role || null,
    ipAddress: options.ipAddress || ctx.ipAddress || null,
    userAgent: options.userAgent || ctx.userAgent || null,
  };
}

/**
 * Field-level audit trail plugin (#709).
 * On pre-save / pre-update / pre-delete: store previous snapshot + jsondiffpatch delta
 * plus IP, User-Agent, and actor role for compliance.
 */
export default function auditTrailPlugin(schema) {
  const saveTrail = async function ({
    model,
    oldDoc,
    newDoc,
    operation,
    options,
  }) {
    try {
      if (!oldDoc) return;

      const before = sanitizeDoc(oldDoc);
      const after = newDoc ? sanitizeDoc(newDoc) : null;
      const delta = after ? differ.diff(before, after) : null;

      // Skip true no-ops only when we could compute an empty delta
      if (operation === "update" && after && !delta) return;

      const { editorId, actorRole, ipAddress, userAgent } = readAuditContext(options);
      const modelName = model.modelName;
      const collectionName = model.collection.name;
      const recordId = before._id || oldDoc._id;

      await RecordSnapshot.create({
        collectionName,
        modelName,
        recordId,
        data: before,
        afterData: after || undefined,
        delta: delta || undefined,
        fieldDiffs: flattenDelta(delta),
        operation,
        editor: editorId || undefined,
        actorRole: actorRole || undefined,
        ipAddress: ipAddress || undefined,
        userAgent: userAgent || undefined,
      });
    } catch (err) {
      console.error("Audit Trail Plugin Error:", err);
    }
  };

  schema.pre("save", async function () {
    if (this.isNew) return;

    try {
      const oldDoc = await this.constructor.findById(this._id).lean();
      if (!oldDoc) return;

      const opts = this.$__.saveOptions || {};
      // After save, `this` holds the new values
      await saveTrail({
        model: this.constructor,
        oldDoc,
        newDoc: this,
        operation: "update",
        options: opts,
      });
    } catch (err) {
      console.error("Audit Trail Plugin Error on save:", err);
    }
  });

  const handleUpdate = async function () {
    try {
      const query = this.getQuery();
      const options = this.getOptions() || {};
      const oldDoc = await this.model.findOne(query).lean();
      if (!oldDoc) return;

      // Project the post-update document for delta (best-effort)
      const update = this.getUpdate() || {};
      const set = update.$set || update;
      const projected = { ...oldDoc, ...set };
      delete projected.$set;
      delete projected.$inc;
      delete projected.$push;
      delete projected.$pull;
      delete projected.$unset;

      // Store previous state; delta may be partial for $inc/$push — still useful
      const afterForDelta =
        update.$set || (!update.$inc && !update.$push && !update.$pull)
          ? projected
          : null;

      await saveTrail({
        model: this.model,
        oldDoc,
        newDoc: afterForDelta,
        operation: "update",
        options,
      });
    } catch (err) {
      console.error("Audit Trail Plugin Error on update:", err);
    }
  };

  schema.pre("findOneAndUpdate", handleUpdate);
  schema.pre("updateOne", handleUpdate);

  const handleDelete = async function () {
    try {
      const query = this.getQuery();
      const options = this.getOptions() || {};
      const oldDoc = await this.model.findOne(query).lean();
      if (!oldDoc) return;

      await saveTrail({
        model: this.model,
        oldDoc,
        newDoc: null,
        operation: "delete",
        options,
      });
    } catch (err) {
      console.error("Audit Trail Plugin Error on delete:", err);
    }
  };

  schema.pre("findOneAndDelete", handleDelete);
  schema.pre("deleteOne", handleDelete);
  schema.pre("findOneAndRemove", handleDelete);
}

export { differ as jsonDiffer };
