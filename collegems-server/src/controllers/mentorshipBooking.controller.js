import MentorshipAvailability from "../models/MentorshipAvailability.model.js";
import MentorshipBooking from "../models/MentorshipBooking.model.js";
import Mentorship from "../models/Mentorship.model.js";
import User from "../models/User.model.js";
import { sendEmail } from "../utils/email.js";
import { buildMentorshipIcs, icsAttachment } from "../utils/icsInvite.js";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const parseHm = (hm) => {
  const [h, m] = String(hm).split(":").map(Number);
  return { h: h || 0, m: m || 0 };
};

const setHm = (date, hm) => {
  const d = new Date(date);
  const { h, m } = parseHm(hm);
  d.setHours(h, m, 0, 0);
  return d;
};

const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && aEnd > bStart;

/**
 * Expand weekly availability into concrete bookable windows in [from, to].
 */
export function expandAvailabilityWindows(availability, from, to, existingBookings = []) {
  if (!availability?.isActive || !availability.slots?.length) return [];

  const duration = availability.slotDurationMin || 30;
  const windows = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const endDay = new Date(to);
  endDay.setHours(23, 59, 59, 999);

  while (cursor <= endDay) {
    const dayName = DAY_NAMES[cursor.getDay()];
    const daySlots = availability.slots.filter((s) => s.day === dayName);

    for (const slot of daySlots) {
      let slotStart = setHm(cursor, slot.startTime);
      const slotEnd = setHm(cursor, slot.endTime);
      if (slotEnd <= slotStart) continue;

      while (slotStart.getTime() + duration * 60_000 <= slotEnd.getTime()) {
        const start = new Date(slotStart);
        const end = new Date(slotStart.getTime() + duration * 60_000);

        if (start >= from && end <= endDay && start > new Date()) {
          const taken = existingBookings.some(
            (b) =>
              ["confirmed", "completed"].includes(b.status) &&
              overlaps(start, end, new Date(b.startTime), new Date(b.endTime))
          );
          if (!taken) {
            windows.push({
              startTime: start.toISOString(),
              endTime: end.toISOString(),
              location: slot.location || "",
              isOnline: !!slot.isOnline,
            });
          }
        }
        slotStart = end;
      }
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return windows;
}

async function sendCalendarInvites(booking, mentor, mentee) {
  try {
    const ics = await buildMentorshipIcs({
      title: `Mentorship: ${mentor.name} ↔ ${mentee.name}`,
      description: booking.purpose || "Peer tutoring / mentorship session",
      location: booking.isOnline ? "Online" : booking.location || "",
      start: new Date(booking.startTime),
      end: new Date(booking.endTime),
      organizer: { name: mentor.name, email: mentor.email },
      attendees: [
        { name: mentor.name, email: mentor.email },
        { name: mentee.name, email: mentee.email },
      ],
    });

    const attachment = icsAttachment(ics);
    const when = new Date(booking.startTime).toLocaleString();
    const subject = `Mentorship session booked — ${when}`;
    const bodyFor = (name) =>
      `Hello ${name},\n\nA mentorship / tutoring session was booked.\n\nWhen: ${when}\nWhere: ${
        booking.isOnline ? "Online" : booking.location || "TBD"
      }\nPurpose: ${booking.purpose || "—"}\n\nOpen the attached .ics file to add this to Google Calendar or Outlook.\n\n— SCMS`;

    if (mentor.email) {
      await sendEmail(mentor.email, subject, bodyFor(mentor.name), "", [attachment]);
    }
    if (mentee.email) {
      await sendEmail(mentee.email, subject, bodyFor(mentee.name), "", [attachment]);
    }

    booking.calendarInviteSentAt = new Date();
    await booking.save();
  } catch (error) {
    console.error("Failed to send mentorship calendar invite:", error.message);
  }
}

export const upsertMyAvailability = async (req, res) => {
  try {
    const role = req.user.role;
    if (!["teacher", "hod", "student"].includes(role)) {
      return res.status(403).json({ message: "Only mentors can publish availability" });
    }

    // Students may publish only if they are assigned as mentors
    if (role === "student") {
      const asMentor = await Mentorship.findOne({
        mentor: req.user.id,
        status: "active",
      });
      if (!asMentor) {
        return res.status(403).json({
          message: "You are not assigned as a mentor yet",
        });
      }
    }

    const { slots = [], slotDurationMin, notes, isActive } = req.body;
    if (!Array.isArray(slots)) {
      return res.status(400).json({ message: "slots must be an array" });
    }

    const doc = await MentorshipAvailability.findOneAndUpdate(
      { mentor: req.user.id },
      {
        mentor: req.user.id,
        slots,
        slotDurationMin: slotDurationMin || 30,
        notes: notes || "",
        isActive: isActive !== false,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ message: "Availability saved", availability: doc });
  } catch (error) {
    console.error("upsertMyAvailability:", error);
    res.status(500).json({ message: error.message || "Failed to save availability" });
  }
};

export const getMyAvailability = async (req, res) => {
  try {
    const availability = await MentorshipAvailability.findOne({ mentor: req.user.id });
    res.json(availability || { slots: [], slotDurationMin: 30, isActive: true, notes: "" });
  } catch (error) {
    res.status(500).json({ message: "Failed to load availability" });
  }
};

export const getAvailableSlots = async (req, res) => {
  try {
    const { mentorId, from, to } = req.query;
    if (!mentorId) {
      return res.status(400).json({ message: "mentorId is required" });
    }

    const start = from ? new Date(from) : new Date();
    const end = to
      ? new Date(to)
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ message: "Invalid from/to dates" });
    }

    const availability = await MentorshipAvailability.findOne({
      mentor: mentorId,
      isActive: true,
    });

    const bookings = await MentorshipBooking.find({
      mentor: mentorId,
      status: { $in: ["confirmed", "completed"] },
      startTime: { $lt: end },
      endTime: { $gt: start },
    });

    const slots = expandAvailabilityWindows(availability, start, end, bookings);
    res.json({ mentorId, slots });
  } catch (error) {
    console.error("getAvailableSlots:", error);
    res.status(500).json({ message: "Failed to load available slots" });
  }
};

export const createBooking = async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only students can book tutoring slots" });
    }

    const { mentorId, startTime, endTime, purpose, location, isOnline } = req.body;
    if (!mentorId || !startTime || !endTime) {
      return res.status(400).json({
        message: "mentorId, startTime, and endTime are required",
      });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return res.status(400).json({ message: "Invalid time range" });
    }
    if (start <= new Date()) {
      return res.status(400).json({ message: "Cannot book a past slot" });
    }

    const mentorship = await Mentorship.findOne({
      mentor: mentorId,
      mentee: req.user.id,
      status: "active",
    });
    if (!mentorship) {
      return res.status(403).json({
        message: "No active mentorship with this mentor. Ask HOD to assign one first.",
      });
    }

    const conflict = await MentorshipBooking.findOne({
      mentor: mentorId,
      status: { $in: ["confirmed", "completed"] },
      startTime: { $lt: end },
      endTime: { $gt: start },
    });
    if (conflict) {
      return res.status(409).json({ message: "That slot was just booked. Pick another time." });
    }

    // Optional: verify slot falls inside published availability
    const availability = await MentorshipAvailability.findOne({
      mentor: mentorId,
      isActive: true,
    });
    const windows = expandAvailabilityWindows(availability, start, end, []);
    const fits = windows.some(
      (w) =>
        new Date(w.startTime).getTime() === start.getTime() &&
        new Date(w.endTime).getTime() === end.getTime()
    );
    if (!fits && availability?.slots?.length) {
      // soft check: allow if within a weekly window even if duration mismatch
      const dayName = DAY_NAMES[start.getDay()];
      const ok = availability.slots.some((s) => {
        if (s.day !== dayName) return false;
        const ws = setHm(start, s.startTime);
        const we = setHm(start, s.endTime);
        return start >= ws && end <= we;
      });
      if (!ok) {
        return res.status(400).json({ message: "Selected time is outside mentor availability" });
      }
    }

    const booking = await MentorshipBooking.create({
      mentorship: mentorship._id,
      mentor: mentorId,
      mentee: req.user.id,
      startTime: start,
      endTime: end,
      purpose: purpose || "",
      location: location || "",
      isOnline: !!isOnline,
      status: "confirmed",
    });

    const mentor = await User.findById(mentorId).select("name email");
    const mentee = await User.findById(req.user.id).select("name email");
    await sendCalendarInvites(booking, mentor, mentee);

    const populated = await MentorshipBooking.findById(booking._id)
      .populate("mentor", "name email role")
      .populate("mentee", "name email studentId");

    res.status(201).json({
      message: "Slot booked. Calendar invites sent when email is configured.",
      booking: populated,
    });
  } catch (error) {
    console.error("createBooking:", error);
    res.status(500).json({ message: error.message || "Failed to book slot" });
  }
};

export const getMyBookings = async (req, res) => {
  try {
    const filter =
      req.user.role === "student"
        ? { mentee: req.user.id }
        : { mentor: req.user.id };

    const bookings = await MentorshipBooking.find(filter)
      .populate("mentor", "name email role")
      .populate("mentee", "name email studentId")
      .sort({ startTime: -1 })
      .limit(100);

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: "Failed to load bookings" });
  }
};

export const cancelBooking = async (req, res) => {
  try {
    const booking = await MentorshipBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const uid = String(req.user.id);
    if (String(booking.mentee) !== uid && String(booking.mentor) !== uid) {
      return res.status(403).json({ message: "Not allowed" });
    }
    if (booking.status === "cancelled") {
      return res.status(400).json({ message: "Already cancelled" });
    }

    booking.status = "cancelled";
    await booking.save();
    res.json({ message: "Booking cancelled", booking });
  } catch (error) {
    res.status(500).json({ message: "Failed to cancel booking" });
  }
};

export const completeBooking = async (req, res) => {
  try {
    const booking = await MentorshipBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (String(booking.mentor) !== String(req.user.id)) {
      return res.status(403).json({ message: "Only the mentor can mark complete" });
    }
    booking.status = "completed";
    await booking.save();
    res.json({ message: "Session marked completed", booking });
  } catch (error) {
    res.status(500).json({ message: "Failed to complete booking" });
  }
};

export const rateBooking = async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only mentees can rate sessions" });
    }

    const { rating, comment } = req.body;
    const score = Number(rating);
    if (!Number.isFinite(score) || score < 1 || score > 5) {
      return res.status(400).json({ message: "rating must be 1–5" });
    }

    const booking = await MentorshipBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (String(booking.mentee) !== String(req.user.id)) {
      return res.status(403).json({ message: "Not your booking" });
    }
    if (booking.status !== "completed") {
      return res.status(400).json({
        message: "You can rate only after the mentor marks the session completed",
      });
    }
    if (booking.rating?.score) {
      return res.status(400).json({ message: "Already rated" });
    }

    booking.rating = {
      score,
      comment: comment || "",
      ratedAt: new Date(),
    };
    await booking.save();

    res.json({ message: "Thanks for your feedback", booking });
  } catch (error) {
    res.status(500).json({ message: "Failed to submit rating" });
  }
};

/** List mentors available to the current student (active mentorships) */
export const listMyMentorsForBooking = async (req, res) => {
  try {
    const links = await Mentorship.find({
      mentee: req.user.id,
      status: "active",
    }).populate("mentor", "name email role department teacherId studentId");

    const mentorIds = links.map((l) => l.mentor?._id).filter(Boolean);
    const avail = await MentorshipAvailability.find({
      mentor: { $in: mentorIds },
      isActive: true,
    });
    const availMap = Object.fromEntries(avail.map((a) => [String(a.mentor), a]));

    res.json(
      links.map((l) => ({
        mentorshipId: l._id,
        mentor: l.mentor,
        hasAvailability: !!availMap[String(l.mentor?._id)]?.slots?.length,
        slotDurationMin: availMap[String(l.mentor?._id)]?.slotDurationMin || 30,
      }))
    );
  } catch (error) {
    res.status(500).json({ message: "Failed to list mentors" });
  }
};
