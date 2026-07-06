import Booking from "../models/Booking.model.js";
import Resource from "../models/Resource.model.js";
import Class from "../models/Classes.model.js";
import { logAction } from "../utils/auditService.js";

// Helper function to check conflicts
const checkConflict = async (resourceId, startTime, endTime, excludeBookingId = null) => {
  const query = {
    resource: resourceId,
    status: { $in: ["approved", "pending"] },
    $and: [
      { startTime: { $lt: new Date(endTime) } },
      { endTime: { $gt: new Date(startTime) } }
    ]
  };

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  const conflictingBooking = await Booking.findOne(query);
  if (conflictingBooking) return conflictingBooking;

  // Check for regular classes
  const resource = await Resource.findById(resourceId);
  if (!resource) return null;

  const start = new Date(startTime);
  const end = new Date(endTime);
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const startDay = days[start.getUTCDay()];

  const classes = await Class.find({
    room: new RegExp(`^${resource.name}$`, "i"),
    schedule: { $regex: startDay, $options: "i" }
  });

  for (const c of classes) {
    const timeMatch = c.schedule.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (timeMatch) {
      let [hours, minutes] = [parseInt(timeMatch[1], 10), parseInt(timeMatch[2], 10)];
      if (timeMatch[3].toUpperCase() === 'PM' && hours !== 12) hours += 12;
      if (timeMatch[3].toUpperCase() === 'AM' && hours === 12) hours = 0;

      const classStart = new Date(start);
      classStart.setUTCHours(hours, minutes, 0, 0);

      const classEnd = new Date(classStart);
      classEnd.setUTCHours(hours + 1); // Assuming 1 hour classes

      if (classStart < end && classEnd > start) {
        return { status: "approved", isClass: true }; // Dummy conflict object for Class
      }
    }
  }

  return null;
};

// @desc    Get available resources for a specific time window
// @route   GET /api/bookings/available
// @access  Private
export const getAvailableResources = async (req, res) => {
  try {
    const { startTime, endTime, type } = req.query;

    if (!startTime || !endTime) {
      return res.status(400).json({ message: "Start and end times are required" });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      return res.status(400).json({ message: "Start time must be before end time" });
    }

    // Find resources that are NOT booked in this interval
    const conflictingBookings = await Booking.find({
      status: { $in: ["approved", "pending"] },
      $and: [
        { startTime: { $lt: end } },
        { endTime: { $gt: start } }
      ]
    }).select("resource");

    const conflictingResourceIds = conflictingBookings.map((b) => b.resource);

    const query = { _id: { $nin: conflictingResourceIds }, status: "active" };
    if (type) query.type = type;

    let availableResources = await Resource.find(query);

    // Filter out classrooms that have regular classes during this time
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const startDay = days[start.getUTCDay()];

    const classes = await Class.find({ schedule: { $regex: startDay, $options: "i" } });
    const conflictingRoomNames = new Set();

    classes.forEach(c => {
      if (!c.room || c.room === "TBD") return;
      
      const timeMatch = c.schedule.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (timeMatch) {
        let [hours, minutes] = [parseInt(timeMatch[1], 10), parseInt(timeMatch[2], 10)];
        if (timeMatch[3].toUpperCase() === 'PM' && hours !== 12) hours += 12;
        if (timeMatch[3].toUpperCase() === 'AM' && hours === 12) hours = 0;
        
        const classStart = new Date(start);
        classStart.setUTCHours(hours, minutes, 0, 0);
        
        const classEnd = new Date(classStart);
        classEnd.setUTCHours(hours + 1);
        
        if (classStart < end && classEnd > start) {
          conflictingRoomNames.add(c.room.trim().toLowerCase());
        }
      }
    });

    if (conflictingRoomNames.size > 0) {
      availableResources = availableResources.filter(r => !conflictingRoomNames.has(r.name.trim().toLowerCase()));
    }

    res.status(200).json(availableResources);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Request a new booking
// @route   POST /api/bookings
// @access  Private
export const createBooking = async (req, res) => {
  try {
    const { resource, purpose, startTime, endTime } = req.body;

    if (!resource || !purpose || !startTime || !endTime) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      return res.status(400).json({ message: "Start time must be before end time" });
    }

    // Duration limits (e.g. max 8 hours)
    const durationHours = (end - start) / (1000 * 60 * 60);
    if (durationHours > 8) {
      return res.status(400).json({ message: "Booking duration cannot exceed 8 hours" });
    }

    const targetResource = await Resource.findById(resource);
    if (!targetResource) {
      return res.status(404).json({ message: "Resource not found" });
    }

    if (targetResource.status !== "active") {
      return res.status(400).json({ message: "Resource is not active" });
    }

    // Check conflict
    const conflict = await checkConflict(resource, start, end);
    if (conflict) {
      return res.status(409).json({ message: "The resource is already booked or pending for this time slot" });
    }

    const booking = await Booking.create({
      resource,
      user: req.user.id,
      purpose,
      startTime: start,
      endTime: end,
      status: "pending",
    });

    await booking.populate("resource", "name type");

    await logAction(req.user.id, "REQUEST_BOOKING", "Booking", booking._id, {
      resource: targetResource.name,
      startTime,
      endTime,
    });

    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get user's own bookings
// @route   GET /api/bookings/my
// @access  Private
export const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id })
      .populate("resource", "name type location")
      .sort("-createdAt");
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get all bookings (Admin)
// @route   GET /api/bookings
// @access  Private/HOD
export const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("resource", "name type location")
      .populate("user", "name email role")
      .sort("-createdAt");
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Update booking status (Approve/Reject)
// @route   PUT /api/bookings/:id/status
// @access  Private/HOD
export const updateBookingStatus = async (req, res) => {
  try {
    const { status, remarks } = req.body;

    if (!["approved", "rejected", "completed", "cancelled"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (status === "approved") {
      // Re-check conflict right before approving
      const conflict = await checkConflict(booking.resource, booking.startTime, booking.endTime, booking._id);
      if (conflict && conflict.status === "approved") {
        return res.status(409).json({ message: "Cannot approve. Resource is already approved for a conflicting time slot." });
      }
    }

    booking.status = status;
    if (remarks) booking.remarks = remarks;
    await booking.save();

    await logAction(req.user.id, `BOOKING_${status.toUpperCase()}`, "Booking", booking._id, { remarks });

    // If approving, we might automatically reject conflicting pending bookings (optional feature)
    if (status === "approved") {
      await Booking.updateMany(
        {
          _id: { $ne: booking._id },
          resource: booking.resource,
          status: "pending",
          $and: [
            { startTime: { $lt: booking.endTime } },
            { endTime: { $gt: booking.startTime } }
          ]
        },
        { $set: { status: "rejected", remarks: "Auto-rejected due to conflict with an approved booking." } }
      );
    }

    res.status(200).json(booking);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Cancel a booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private
export const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Only creator or HOD can cancel
    if (booking.user.toString() !== req.user.id && req.user.role !== "hod") {
      return res.status(403).json({ message: "Not authorized to cancel this booking" });
    }

    if (booking.status === "completed") {
      return res.status(400).json({ message: "Cannot cancel a completed booking" });
    }

    booking.status = "cancelled";
    await booking.save();

    await logAction(req.user.id, "CANCEL_BOOKING", "Booking", booking._id, {});

    res.status(200).json(booking);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
