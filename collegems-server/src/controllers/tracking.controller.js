import Tracking from "../models/Tracking.model.js";
import Course from "../models/Course.model.js";
import User from "../models/User.model.js";

const ENTITY_MODELS = {
  Student: User,
  Course: Course,
  Department: null,
};

const ENTITY_SELECT = {
  Student: "name email studentId department semester course",
  Course: "name code department",
  Department: null,
};

export const recordView = async (req, res) => {
  try {
    const { entityType, entityId } = req.body;

    if (!entityType || !entityId) {
      return res.status(400).json({ success: false, message: "entityType and entityId are required" });
    }

    if (!ENTITY_MODELS[entityType]) {
      return res.status(400).json({ success: false, message: `Invalid entityType: ${entityType}` });
    }

    const tracking = await Tracking.findOneAndUpdate(
      { entityType, entityId },
      { $inc: { count: 1 } },
      { upsert: true, new: true },
    );

    return res.json({ success: true, data: tracking });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to record view", error: error.message });
  }
};

export const getTrackingStats = async (req, res) => {
  try {
    const { type, limit = 10 } = req.query;
    const validTypes = type ? [type] : ["Student", "Course", "Department"];
    const resultLimit = Math.min(Number(limit) || 10, 50);

    const stats = {};
    for (const entityType of validTypes) {
      const records = await Tracking.find({ entityType })
        .sort({ count: -1 })
        .limit(resultLimit)
        .lean();

      const model = ENTITY_MODELS[entityType];
      if (model && records.length > 0) {
        const ids = records.map((r) => r.entityId);
        const entities = await model
          .find({ _id: { $in: ids } })
          .select(ENTITY_SELECT[entityType])
          .lean();

        const entityMap = new Map(entities.map((e) => [e._id.toString(), e]));

        stats[entityType.toLowerCase() + "s"] = records.map((r) => ({
          _id: r._id,
          entityId: r.entityId,
          count: r.count,
          entity: entityMap.get(r.entityId.toString()) || null,
        }));
      } else {
        stats[entityType.toLowerCase() + "s"] = records.map((r) => ({
          _id: r._id,
          entityId: r.entityId,
          count: r.count,
          entity: null,
        }));
      }
    }

    return res.json({ success: true, data: stats });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch tracking stats", error: error.message });
  }
};

export const resetTracking = async (req, res) => {
  try {
    const { entityType, entityId } = req.body;

    const filter = {};
    if (entityType) filter.entityType = entityType;
    if (entityId) filter.entityId = entityId;

    if (entityType && entityId) {
      await Tracking.findOneAndUpdate(filter, { count: 0 });
    } else {
      await Tracking.deleteMany(filter);
    }

    return res.json({ success: true, message: "Tracking data reset successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to reset tracking", error: error.message });
  }
};
