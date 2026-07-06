import RecentHistory from "../models/RecentHistory.model.js";

const HISTORY_LIMIT = 20;

export const getHistory = async (req, res) => {
  try {
    const history = await RecentHistory.find({ user: req.user._id })
      .sort({ viewedAt: -1 })
      .limit(HISTORY_LIMIT);
    res.status(200).json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addHistoryEntry = async (req, res) => {
  try {
    const { entityType, entityId, displayName, url } = req.body;
    
    // Upsert the entry (update viewedAt if it exists)
    await RecentHistory.findOneAndUpdate(
      { user: req.user._id, entityType, entityId },
      { displayName, url, viewedAt: Date.now() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Enforce limit: find the 20th item and delete anything older
    const excessEntries = await RecentHistory.find({ user: req.user._id })
      .sort({ viewedAt: -1 })
      .skip(HISTORY_LIMIT)
      .select('_id');
      
    if (excessEntries.length > 0) {
      const idsToDelete = excessEntries.map(e => e._id);
      await RecentHistory.deleteMany({ _id: { $in: idsToDelete } });
    }

    res.status(200).json({ success: true, message: "History updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
