import StudentTimelineEvent from "../models/StudentTimelineEvent.model.js";

export default function timelinePlugin(schema, options) {
  const trackedFields = options?.trackedFields || [];

  // Hook for .save()
  schema.pre("save", async function () {
    if (this.isNew) return;
    if (this.role !== "student") return; // Only track students

    try {
      // Fetch the document state exactly as it exists in DB right now
      const oldDoc = await this.constructor.findById(this._id).lean();
      if (!oldDoc) return;

      const events = [];
      trackedFields.forEach(field => {
        if (this.isModified(field)) {
          const oldVal = oldDoc[field];
          const newVal = this.get(field);

          // Loose string check prevents false positives between ObjectIds, strings, and numbers
          if (String(oldVal) !== String(newVal)) {
            events.push({
              student: this._id,
              changedBy: this._updatedBy || this._id, // allow controllers to pass _updatedBy
              field,
              oldValue: oldVal,
              newValue: newVal
            });
          }
        }
      });

      if (events.length > 0) {
        await StudentTimelineEvent.insertMany(events);
      }
    } catch (err) {
      console.error("Timeline Plugin Error on save:", err);
    }
  });

  // Hook for .findOneAndUpdate()
  schema.pre("findOneAndUpdate", async function () {
    try {
      const update = this.getUpdate();
      if (!update || (!update.$set && !update)) return;
      
      // We only analyze explicit changes in $set for this implementation
      const updatePayload = update.$set || update;
      
      const docToUpdate = await this.model.findOne(this.getQuery()).lean();
      if (!docToUpdate || docToUpdate.role !== "student") return;

      const events = [];
      trackedFields.forEach(field => {
        if (updatePayload[field] !== undefined) {
          const oldVal = docToUpdate[field];
          const newVal = updatePayload[field];
          
          if (String(oldVal) !== String(newVal)) {
            events.push({
              student: docToUpdate._id,
              changedBy: this.options.updatedBy || docToUpdate._id,
              field,
              oldValue: oldVal,
              newValue: newVal
            });
          }
        }
      });

      if (events.length > 0) {
        await StudentTimelineEvent.insertMany(events);
      }
    } catch (err) {
      console.error("Timeline Plugin Error on findOneAndUpdate:", err);
    }
  });
}
