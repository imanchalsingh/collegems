import mongoose from "mongoose";

// Configuration for models that support archiving/restoring
const RESTORE_CONFIG = {
  User: {
    archiveField: "accountStatus",
    archivedValue: "archived",
    activeValue: "active",
    uniqueFields: ["email"],
    populate: "childId studentId teacherId department",
  },
  HallAllocation: {
    archiveField: "status",
    archivedValue: "archived",
    activeValue: "draft",
    uniqueFields: [],
    populate: "examSchedule",
  },
  // Add other models here as needed
};

export const getSupportedModels = () => {
  return Object.keys(RESTORE_CONFIG);
};

export const getArchivedRecords = async (modelName, page = 1, limit = 10) => {
  if (!RESTORE_CONFIG[modelName]) {
    throw new Error(`Model ${modelName} does not support restoration or is not configured.`);
  }

  const Model = mongoose.model(modelName);
  const config = RESTORE_CONFIG[modelName];

  const skip = (page - 1) * limit;
  const filter = { [config.archiveField]: config.archivedValue };

  const query = Model.find(filter).skip(skip).limit(limit);
  if (config.populate) {
    query.populate(config.populate);
  }

  const records = await query.exec();
  const total = await Model.countDocuments(filter);

  return { records, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const getArchivedRecordDetails = async (modelName, id) => {
  if (!RESTORE_CONFIG[modelName]) {
    throw new Error(`Model ${modelName} does not support restoration or is not configured.`);
  }

  const Model = mongoose.model(modelName);
  const config = RESTORE_CONFIG[modelName];

  const query = Model.findById(id);
  if (config.populate) {
    query.populate(config.populate);
  }

  const record = await query.exec();
  if (!record) throw new Error("Record not found");

  return record;
};

export const validateRestorationEligibility = async (modelName, id) => {
  if (!RESTORE_CONFIG[modelName]) {
    throw new Error(`Model ${modelName} does not support restoration or is not configured.`);
  }

  const Model = mongoose.model(modelName);
  const config = RESTORE_CONFIG[modelName];
  const record = await Model.findById(id);

  if (!record) throw new Error("Record not found");
  if (record[config.archiveField] !== config.archivedValue) {
    throw new Error("Record is not archived");
  }

  // Check for unique constraint conflicts before restoring
  for (const field of config.uniqueFields) {
    const value = record[field];
    if (value) {
      const existing = await Model.findOne({
        [field]: value,
        [config.archiveField]: { $ne: config.archivedValue }, // Any non-archived record
        _id: { $ne: record._id }
      });
      
      if (existing) {
        return { 
          eligible: false, 
          reason: `Conflict: An active record already exists with ${field} = ${value}.` 
        };
      }
    }
  }

  return { eligible: true, record };
};

export const restoreRecord = async (modelName, id, restoredByUserId) => {
  const eligibility = await validateRestorationEligibility(modelName, id);
  if (!eligibility.eligible) {
    throw new Error(eligibility.reason);
  }

  const { record } = eligibility;
  const config = RESTORE_CONFIG[modelName];

  // Apply restoration
  record[config.archiveField] = config.activeValue;
  
  // Maintain audit information
  record.restoredAt = new Date();
  record.restoredBy = restoredByUserId;

  await record.save();
  return record;
};
