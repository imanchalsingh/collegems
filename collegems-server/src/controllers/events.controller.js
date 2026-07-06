import Event from "../models/Events.model.js";
import EventAttendance from "../models/EventAttendance.model.js";
import crypto from "crypto";
import User from "../models/User.model.js";
import { checkScheduleConflicts } from "../services/calendarValidation.service.js";


// CREATE
export const createEvent = async (req, res) => {
    try {
        const { date, startTime, endTime } = req.body;
        
        if (date) {
            const validation = await checkScheduleConflicts({
                date,
                startTime: startTime || "",
                endTime: endTime || ""
            });

            if (validation.hasConflict) {
                return res.status(409).json({
                    success: false,
                    message: validation.conflictMessage,
                    conflictDetails: validation.conflictDetails
                });
            }
        }

        const event = new Event({ ...req.body, createdBy: req.user.id });
        await event.save();

        res.status(201).json({
            success: true,
            message: "Event created successfully",
            data: event,
        });
    } catch (error) {
        const statusCode = error.name === "ValidationError" ? 400 : 500;
        res.status(statusCode).json({ success: false, message: error.message });
    }
};

// /get all event - read only
export const getAllEvents = async (req, res) => {
    try {
        const events = await Event.find().sort({ date: 1 });

        res.json({
            success: true,
            count: events.length,
            data: events,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// get single event by id - when click on any event - view in dialog box
export const getEventById = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        res.json({ success: true, data: event });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// update event - admin only
export const updateEvent = async (req, res) => {
    try {
        const existingEvent = await Event.findById(req.params.id);
        if (!existingEvent) {
            return res.status(404).json({ message: "Event not found" });
        }

        const newDate = req.body.date || existingEvent.date;
        const newStartTime = req.body.startTime !== undefined ? req.body.startTime : existingEvent.startTime;
        const newEndTime = req.body.endTime !== undefined ? req.body.endTime : existingEvent.endTime;

        if (newDate) {
            const validation = await checkScheduleConflicts({
                date: newDate,
                startTime: newStartTime || "",
                endTime: newEndTime || "",
                excludeId: req.params.id
            });

            if (validation.hasConflict) {
                return res.status(409).json({
                    success: false,
                    message: validation.conflictMessage,
                    conflictDetails: validation.conflictDetails
                });
            }
        }

        const event = await Event.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        res.json({
            success: true,
            message: "Event updated",
            data: event,
        });
    } catch (error) {
        const statusCode = error.name === "ValidationError" ? 400 : 500;
        res.status(statusCode).json({ success: false, message: error.message });
    }
};

// delete event - admin 
export const deleteEvent = async (req, res) => {
    try {
        const event = await Event.findByIdAndDelete(req.params.id);

        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        res.json({
            success: true,
            message: "Event deleted successfully",
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Generate or Regenerate QR Code for Event
export const generateEventQRCode = async (req, res) => {
    try {
        const eventId = req.params.id;
        const newQrCode = crypto.randomBytes(16).toString("hex");

        const event = await Event.findByIdAndUpdate(
            eventId,
            { qrCode: newQrCode },
            { new: true }
        );

        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        res.json({
            success: true,
            message: "QR Code generated successfully",
            data: { qrCode: event.qrCode, qrCodeActive: event.qrCodeActive },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Toggle QR Code Active Status
export const toggleQRCodeStatus = async (req, res) => {
    try {
        const eventId = req.params.id;
        const { isActive } = req.body;

        const event = await Event.findByIdAndUpdate(
            eventId,
            { qrCodeActive: isActive },
            { new: true }
        );

        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        res.json({
            success: true,
            message: `QR Code is now ${isActive ? 'active' : 'inactive'}`,
            data: { qrCodeActive: event.qrCodeActive },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Check-in using QR Code
export const checkInEvent = async (req, res) => {
    try {
        const { qrCode } = req.body;
        const participantId = req.user.id;

        const event = await Event.findOne({ qrCode });

        if (!event) {
            return res.status(404).json({ message: "Invalid QR Code or Event not found" });
        }

        const eventId = event._id;

        if (!event.qrCodeActive) {
            return res.status(400).json({ message: "Check-in is currently closed for this event" });
        }

        // Time-based validation: Check if event is happening today
        const now = new Date();
        const eventDate = new Date(event.date);
        
        // Simple validation: Same day check
        if (now.toDateString() !== eventDate.toDateString()) {
            return res.status(400).json({ message: "Check-in is only allowed on the day of the event" });
        }

        // Create attendance record
        const attendance = new EventAttendance({
            event: eventId,
            participant: participantId,
            status: "checked-in",
        });

        await attendance.save();

        res.json({
            success: true,
            message: "Successfully checked in to the event",
            data: attendance,
        });
    } catch (error) {
        if (error.code === 11000) {
            // Duplicate key error for index { event: 1, participant: 1 }
            return res.status(400).json({ success: false, message: "You have already checked in to this event" });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Event Attendance
export const getEventAttendance = async (req, res) => {
    try {
        const eventId = req.params.id;
        
        const attendance = await EventAttendance.find({ event: eventId })
            .populate("participant", "name email rollNo department")
            .sort({ checkInTime: -1 });

        res.json({
            success: true,
            count: attendance.length,
            data: attendance,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const markEventAsRead = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({
                success: false,
                message: "Event not found",
            });
        }

        const userId = req.user.id;

        if (!event.readBy.some(id => id.toString() === userId)) {
            event.readBy.push(userId);
            await event.save();
        }

        res.status(200).json({
            success: true,
            message: "Event marked as read",
            data: event,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const markEventAsUnread = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({
                success: false,
                message: "Event not found",
            });
        }

        const userId = req.user.id;

        event.readBy = event.readBy.filter(
            id => id.toString() !== userId
        );

        await event.save();

        res.status(200).json({
            success: true,
            message: "Event marked as unread",
            data: event,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const getReadCount = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({
                success: false,
                message: "Event not found",
            });
        }

        res.status(200).json({
            success: true,
            readCount: event.readBy.length,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
export const getReaders = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id)
            .populate("readBy", "name email studentId");

        if (!event) {
            return res.status(404).json({
                success: false,
                message: "Event not found",
            });
        }

        res.status(200).json({
            success: true,
            count: event.readBy.length,
            data: event.readBy,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const getUnreadStudents = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({
                success: false,
                message: "Event not found",
            });
        }

        const students = await User.find({
            role: "student",
        });

        const unreadStudents = students.filter(
            student =>
                !event.readBy.some(
                    id => id.toString() === student._id.toString()
                )
        );

        res.status(200).json({
            success: true,
            count: unreadStudents.length,
            data: unreadStudents,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};