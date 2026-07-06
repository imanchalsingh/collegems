import SavedFilter from "../models/SavedFilter.model.js";

// @desc    Get all saved filters for a specific dashboard
// @route   GET /api/saved-filters/:dashboard
// @access  Private
export const getSavedFilters = async (req, res) => {
  try {
    const filters = await SavedFilter.find({
      user: req.user._id,
      dashboard: req.params.dashboard,
    }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: filters.length, data: filters });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Create a new saved filter
// @route   POST /api/saved-filters
// @access  Private
export const createSavedFilter = async (req, res) => {
  try {
    const { name, dashboard, filters } = req.body;

    if (!name || !dashboard || !filters) {
      return res.status(400).json({ success: false, message: "Please provide name, dashboard, and filters" });
    }

    // Check if the user already has a filter with this name on this dashboard
    const existing = await SavedFilter.findOne({ user: req.user._id, dashboard, name });
    
    if (existing) {
      // If it exists, update it rather than throwing an error (acts like an overwrite)
      existing.filters = filters;
      await existing.save();
      return res.status(200).json({ success: true, data: existing, message: "Saved filter updated" });
    }

    const savedFilter = await SavedFilter.create({
      user: req.user._id,
      name,
      dashboard,
      filters,
    });

    res.status(201).json({ success: true, data: savedFilter });
  } catch (error) {
    // Handle mongoose duplicate key error explicitly just in case
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Filter with this name already exists" });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete a saved filter
// @route   DELETE /api/saved-filters/:id
// @access  Private
export const deleteSavedFilter = async (req, res) => {
  try {
    const filter = await SavedFilter.findById(req.params.id);

    if (!filter) {
      return res.status(404).json({ success: false, message: "Saved filter not found" });
    }

    // Ensure the user owns this filter
    if (filter.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to delete this filter" });
    }

    await filter.deleteOne();

    res.status(200).json({ success: true, message: "Saved filter deleted" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
