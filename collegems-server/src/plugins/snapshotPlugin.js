import RecordSnapshot from "../models/RecordSnapshot.model.js";

export default function snapshotPlugin(schema) {
  // Common function to save snapshot
  const saveSnapshot = async function (doc, operation, options) {
    try {
      if (!doc) return;

      const editorId = options?.editorId || doc._updatedBy || doc._id;

      const dataPayload = doc.toObject ? doc.toObject() : { ...doc };
      delete dataPayload.constructor;

      await RecordSnapshot.create({
        collectionName: doc.constructor.collection.name,
        modelName: doc.constructor.modelName,
        recordId: doc._id,
        data: dataPayload,
        operation,
        editor: editorId,
      });
    } catch (err) {
      console.error("Snapshot Plugin Error:", err);
    }
  };

  // 1. Hook for .save()
  // Triggers before a document is updated via .save()
  schema.pre("save", async function (options) {
    // We only take snapshots of existing documents being modified
    if (this.isNew) {
      return;
    }

    try {
      const oldDoc = await this.constructor.findById(this._id).lean();
      if (oldDoc) {
        // Need to pass the constructor so modelName is available in saveSnapshot
        oldDoc.constructor = this.constructor;
        // In some Mongoose versions options is passed, otherwise we can look it up
        const opts = (typeof options === 'object' && options) ? options : this.$__saveOptions;
        await saveSnapshot(oldDoc, "update", opts);
      }
    } catch (err) {
      console.error("Snapshot Plugin Error on save:", err);
    }
  });

  // 2. Hook for findOneAndUpdate / updateOne
  const handleUpdate = async function () {
    try {
      const query = this.getQuery();
      const options = this.getOptions();

      // Find the document BEFORE it is updated
      const oldDoc = await this.model.findOne(query).lean();

      if (oldDoc) {
        oldDoc.constructor = this.model;
        await saveSnapshot(oldDoc, "update", options);
      }
    } catch (err) {
      console.error("Snapshot Plugin Error on update:", err);
    }
  };

  schema.pre("findOneAndUpdate", handleUpdate);
  schema.pre("updateOne", handleUpdate);

  // 3. Hook for findOneAndDelete / deleteOne
  const handleDelete = async function () {
    try {
      const query = this.getQuery();
      const options = this.getOptions();

      // Find the document BEFORE it is deleted
      const oldDoc = await this.model.findOne(query).lean();

      if (oldDoc) {
        oldDoc.constructor = this.model;
        await saveSnapshot(oldDoc, "delete", options);
      }
    } catch (err) {
      console.error("Snapshot Plugin Error on delete:", err);
    }
  };

  schema.pre("findOneAndDelete", handleDelete);
  schema.pre("deleteOne", handleDelete);
  schema.pre("findOneAndRemove", handleDelete);
}
