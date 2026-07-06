/**
 * Timezone Normalization Plugin
 * 
 * Normalizes schedule-related Date fields to be independent of local timezone.
 * Strips the time component to force exact UTC midnight, ensuring dates
 * remain consistent across different client timezones.
 */

export default function timezonePlugin(schema) {
  const fieldsToNormalize = ['date', 'examDate', 'registrationDeadline'];

  // Identify which of the target fields are actually Date types in this schema
  const targetPaths = [];
  schema.eachPath((pathname, schemaType) => {
    if (fieldsToNormalize.includes(pathname) && schemaType.instance === 'Date') {
      targetPaths.push(pathname);
    }
  });

  if (targetPaths.length === 0) return;

  const normalizeToUTC = (date) => {
    if (!date) return date;
    const d = new Date(date);
    // Force exact UTC midnight
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  };

  schema.pre('save', function (next) {
    targetPaths.forEach((path) => {
      if (this.isModified(path) && this[path]) {
        this[path] = normalizeToUTC(this[path]);
      }
    });
    next();
  });

  schema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function (next) {
    const update = this.getUpdate();
    if (!update) return next();

    targetPaths.forEach((path) => {
      if (update[path]) {
        update[path] = normalizeToUTC(update[path]);
      }
      if (update.$set && update.$set[path]) {
        update.$set[path] = normalizeToUTC(update.$set[path]);
      }
    });
    next();
  });
}
