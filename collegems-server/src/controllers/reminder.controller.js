import User from "../models/user.model.js"; // Ensure this matches your exact filename
import Reminder from "../models/Reminder.model.js";

// Fetch users missing required fields (Expected Behavior: Show pending users)
export const getPendingUsers = async (req, res) => {
  try {
    // Adjust this query based on what "incomplete" means in your User model
    const pendingUsers = await User.find({
      $or: [
        { phone: { $exists: false } },
        { phone: "" },
        { address: { $exists: false } }
      ],
    }).select("name email phone role"); 

    res.status(200).json({ success: true, data: pendingUsers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add users to the reminder queue (Acceptance Criteria: Reminder queue updates)
export const queueReminders = async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!userIds || !userIds.length) {
      return res.status(400).json({ success: false, message: "No users provided" });
    }

    // Create a queue entry for each user
    const remindersToQueue = userIds.map((id) => ({
      user: id,
      type: "incomplete_profile",
      status: "queued",
    }));

    await Reminder.insertMany(remindersToQueue);

    res.status(200).json({ success: true, message: "Reminders successfully queued!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};