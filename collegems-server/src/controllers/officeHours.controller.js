import OfficeHours from "../models/OfficeHours.model.js";
import User from "../models/User.model.js";

export const getMyOfficeHours = async (req, res) => {
  try {
    let officeHours = await OfficeHours.findOne({ faculty: req.user.id });
    if (!officeHours) {
      officeHours = { faculty: req.user.id, slots: [], notes: "", isActive: true };
    }
    res.json(officeHours);
  } catch (error) {
    console.error("Error fetching office hours:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const setMyOfficeHours = async (req, res) => {
  try {
    const { slots, notes, isActive } = req.body;
    if (!Array.isArray(slots)) {
      return res.status(400).json({ message: "Slots must be an array" });
    }

    for (const slot of slots) {
      if (!slot.day || !slot.startTime || !slot.endTime) {
        return res.status(400).json({ message: "Each slot requires day, startTime, and endTime" });
      }
    }

    const officeHours = await OfficeHours.findOneAndUpdate(
      { faculty: req.user.id },
      { faculty: req.user.id, slots, notes: notes || "", isActive: isActive !== undefined ? isActive : true },
      { upsert: true, new: true, runValidators: true }
    );

    res.json(officeHours);
  } catch (error) {
    console.error("Error setting office hours:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getFacultyOfficeHours = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select("name email teacherId department role");
    if (!user || (user.role !== "teacher" && user.role !== "hod")) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    const officeHours = await OfficeHours.findOne({ faculty: id, isActive: true });

    res.json({
      faculty: user,
      officeHours: officeHours || { slots: [], notes: "" },
    });
  } catch (error) {
    console.error("Error fetching faculty office hours:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAllOfficeHours = async (req, res) => {
  try {
    const officeHoursList = await OfficeHours.find({ isActive: true })
      .populate("faculty", "name email teacherId department role")
      .sort({ createdAt: -1 });

    const result = officeHoursList
      .filter((oh) => oh.faculty && oh.slots.length > 0)
      .map((oh) => ({
        faculty: oh.faculty,
        slots: oh.slots,
        notes: oh.notes,
      }));

    res.json(result);
  } catch (error) {
    console.error("Error fetching all office hours:", error);
    res.status(500).json({ message: "Server error" });
  }
};
