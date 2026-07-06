import DataLockWindow from "../models/DataLockWindow.model.js";

export const createLockWindow = async (req, res, next) => {
  try {
    const { name, startTime, endTime, affectedModules, isActive } = req.body;

    const newLock = await DataLockWindow.create({
      name,
      startTime,
      endTime,
      affectedModules,
      isActive,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: "Data lock window created successfully",
      data: newLock
    });
  } catch (error) {
    next(error);
  }
};

export const getLockWindows = async (req, res, next) => {
  try {
    const { status } = req.query;
    let query = {};
    
    if (status === "active") {
      const now = new Date();
      query = {
        isActive: true,
        startTime: { $lte: now },
        endTime: { $gte: now }
      };
    } else if (status === "upcoming") {
      const now = new Date();
      query = {
        isActive: true,
        startTime: { $gt: now }
      };
    }

    const locks = await DataLockWindow.find(query)
      .populate("createdBy", "name email")
      .sort({ startTime: 1 });

    res.status(200).json({
      success: true,
      data: locks
    });
  } catch (error) {
    next(error);
  }
};

export const updateLockWindow = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, startTime, endTime, affectedModules, isActive } = req.body;

    const updatedLock = await DataLockWindow.findByIdAndUpdate(
      id,
      { name, startTime, endTime, affectedModules, isActive },
      { new: true, runValidators: true }
    );

    if (!updatedLock) {
      return res.status(404).json({ success: false, message: "Lock window not found" });
    }

    res.status(200).json({
      success: true,
      message: "Data lock window updated successfully",
      data: updatedLock
    });
  } catch (error) {
    next(error);
  }
};

export const deleteLockWindow = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deletedLock = await DataLockWindow.findByIdAndDelete(id);

    if (!deletedLock) {
      return res.status(404).json({ success: false, message: "Lock window not found" });
    }

    res.status(200).json({
      success: true,
      message: "Data lock window deleted successfully"
    });
  } catch (error) {
    next(error);
  }
};
