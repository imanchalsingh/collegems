import Club, { ROLES } from "../models/Club.model.js";
import Event from "../models/Events.model.js";
import mongoose from "mongoose";

// FIXED: Now safely handles both Populated objects (from populateClub) and standard ObjectIds
const isAdminOf = (club, userId) => {
  const uId = userId.toString();
  const creatorId = club.createdBy._id ? club.createdBy._id.toString() : club.createdBy.toString();
  return (
    creatorId === uId ||
    club.admins.some((a) => (a._id ? a._id.toString() : a.toString()) === uId)
  );
};

// FIXED: Safely handles both Populated objects and standard ObjectIds
const isMemberOf = (club, userId) => {
  const uId = userId.toString();
  return club.members.some((m) => {
    const memberUserId = m.user._id ? m.user._id.toString() : m.user.toString();
    return memberUserId === uId;
  });
};
const populateClub = (query) =>
  query
    .populate("createdBy", "name email role")
    .populate("admins", "name email role")
    .populate("members.user", "name email role teacherId studentId department")
    .populate("pendingRequests.user", "name email role teacherId studentId department")
    .populate("events", "title date status category")
    .populate("announcements.postedBy", "name email"); 
// ─── Create club ───────────────────────────────────────────────────────────────
export const createClub = async (req, res) => {
  try {
    const { name, description, category, logo, maxMembers } = req.body;
    const userId = req.user._id || req.user.id; // FIXED: fallback to ensure valid ID

    if (!name || !description) {
      return res.status(400).json({ message: "Name and description are required" });
    }

    const existing = await Club.findOne({ name });
    if (existing) {
      return res.status(409).json({ message: "A club with this name already exists" });
    }

    const club = await Club.create({
      name,
      description,
      category,
      logo,
      maxMembers,
      createdBy: userId,
      admins: [userId],
      members: [{ user: userId, role: "president" }],
    });

    const populated = await populateClub(Club.findById(club._id));
    res.status(201).json(populated);
  } catch (err) {
    console.error("Create club error:", err);
    res.status(500).json({ message: "Failed to create club" });
  }
};

// ─── Get all clubs ──────────────────────────────────────────────────────────────
export const getAllClubs = async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter = { isActive: true };
    if (category) filter.category = category;
    if (search) filter.name = { $regex: search, $options: "i" };

    const clubs = await populateClub(Club.find(filter).sort({ createdAt: -1 }));
    res.json(clubs);
  } catch (err) {
    console.error("Get clubs error:", err);
    res.status(500).json({ message: "Failed to fetch clubs" });
  }
};

// ─── Get single club ─────────────────────────────────────────────────────────────
export const getClubById = async (req, res) => {
  try {
    const club = await populateClub(Club.findById(req.params.id));
    if (!club) return res.status(404).json({ message: "Club not found" });
    res.json(club);
  } catch (err) {
    console.error("Get club error:", err);
    res.status(500).json({ message: "Failed to fetch club" });
  }
};

// ─── Get clubs current user belongs to (member or admin) ──────────────────────────
export const getMyClubs = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const clubs = await populateClub(
      Club.find({ "members.user": userId }).sort({ createdAt: -1 })
    );
    res.json(clubs);
  } catch (err) {
    console.error("Get my clubs error:", err);
    res.status(500).json({ message: "Failed to fetch your clubs" });
  }
};

// ─── Update club ────────────────────────────────────────────────────────────────
export const updateClub = async (req, res) => {
  try {
    const club = await Club.findById(req.params.id);
    const userId = req.user._id || req.user.id;
    
    if (!club) return res.status(404).json({ message: "Club not found" });

    if (!isAdminOf(club, userId) && req.user.role !== "hod") {
      return res.status(403).json({ message: "Only club admins can update club details" });
    }

    const { name, description, category, logo, maxMembers, isActive } = req.body;
    if (name) club.name = name;
    if (description) club.description = description;
    if (category) club.category = category;
    if (logo !== undefined) club.logo = logo;
    if (maxMembers) club.maxMembers = maxMembers;
    if (isActive !== undefined) club.isActive = isActive;

    await club.save();
    const populated = await populateClub(Club.findById(club._id));
    res.json(populated);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "A club with this name already exists" });
    }
    console.error("Update club error:", err);
    res.status(500).json({ message: "Failed to update club" });
  }
};

// ─── Delete club ────────────────────────────────────────────────────────────────
export const deleteClub = async (req, res) => {
  try {
    const club = await Club.findById(req.params.id);
    const userId = req.user._id || req.user.id;

    if (!club) return res.status(404).json({ message: "Club not found" });

    if (!isAdminOf(club, userId) && req.user.role !== "hod") {
      return res.status(403).json({ message: "Only club admins can delete this club" });
    }

    await Club.findByIdAndDelete(req.params.id);
    res.json({ message: "Club deleted successfully" });
  } catch (err) {
    console.error("Delete club error:", err);
    res.status(500).json({ message: "Failed to delete club" });
  }
};

// ─── Request to join a club ────────────────────────────────────────────────────────
export const requestToJoin = async (req, res) => {
  try {
    const club = await Club.findById(req.params.id);
    const userId = req.user._id || req.user.id; // FIXED: Guarantees a valid ID

    if (!club) return res.status(404).json({ message: "Club not found" });

    if (isMemberOf(club, userId)) {
      return res.status(409).json({ message: "You are already a member of this club" });
    }

    const alreadyRequested = club.pendingRequests.some(
      (r) => r.user.toString() === userId.toString()
    );
    if (alreadyRequested) {
      return res.status(409).json({ message: "You already have a pending request for this club" });
    }

    if (club.members.length >= club.maxMembers) {
      return res.status(400).json({ message: "This club has reached its maximum membership limit" });
    }

    // FIXED: Push the guaranteed ID and force Mongoose to save the array
    club.pendingRequests.push({ user: userId, message: req.body.message || "" });
    club.markModified('pendingRequests'); 
    await club.save();

    res.status(201).json({ message: "Join request submitted successfully" });
  } catch (err) {
    console.error("Join request error:", err);
    res.status(500).json({ message: "Failed to submit join request" });
  }
};

// ─── Get pending requests (admin) ───────────────────────────────────────────────────
export const getPendingRequests = async (req, res) => {
  try {
    const club = await populateClub(Club.findById(req.params.id));
    const userId = req.user._id || req.user.id;

    if (!club) return res.status(404).json({ message: "Club not found" });

    if (!isAdminOf(club, userId) && req.user.role !== "hod") {
      return res.status(403).json({ message: "Only club admins can view join requests" });
    }

    res.json(club.pendingRequests);
  } catch (err) {
    console.error("Get pending requests error:", err);
    res.status(500).json({ message: "Failed to fetch join requests" });
  }
};

// ─── Approve a join request ──────────────────────────────────────────────────────────
export const approveRequest = async (req, res) => {
  try {
    const club = await Club.findById(req.params.id);
    const adminId = req.user._id || req.user.id;

    if (!club) return res.status(404).json({ message: "Club not found" });

    if (!isAdminOf(club, adminId) && req.user.role !== "hod") {
      return res.status(403).json({ message: "Only club admins can approve join requests" });
    }

    const { userId } = req.params;
    const requestIndex = club.pendingRequests.findIndex((r) => r.user.toString() === userId);
    if (requestIndex === -1) {
      return res.status(404).json({ message: "Join request not found" });
    }

    if (club.members.length >= club.maxMembers) {
      return res.status(400).json({ message: "Club has reached its maximum membership limit" });
    }

    club.pendingRequests.splice(requestIndex, 1);
    club.members.push({ user: userId, role: "member" });
    club.markModified('pendingRequests');
    club.markModified('members');
    await club.save();

    const populated = await populateClub(Club.findById(club._id));
    res.json(populated);
  } catch (err) {
    console.error("Approve request error:", err);
    res.status(500).json({ message: "Failed to approve join request" });
  }
};

// ─── Reject a join request ───────────────────────────────────────────────────────────
export const rejectRequest = async (req, res) => {
  try {
    const club = await Club.findById(req.params.id);
    const adminId = req.user._id || req.user.id;

    if (!club) return res.status(404).json({ message: "Club not found" });

    if (!isAdminOf(club, adminId) && req.user.role !== "hod") {
      return res.status(403).json({ message: "Only club admins can reject join requests" });
    }

    const { userId } = req.params;
    const requestIndex = club.pendingRequests.findIndex((r) => r.user.toString() === userId);
    if (requestIndex === -1) {
      return res.status(404).json({ message: "Join request not found" });
    }

    club.pendingRequests.splice(requestIndex, 1);
    club.markModified('pendingRequests');
    await club.save();

    res.json({ message: "Join request rejected" });
  } catch (err) {
    console.error("Reject request error:", err);
    res.status(500).json({ message: "Failed to reject join request" });
  }
};

// ─── Remove a member ──────────────────────────────────────────────────────────────────
export const removeMember = async (req, res) => {
  try {
    const club = await Club.findById(req.params.id);
    const adminId = req.user._id || req.user.id;

    if (!club) return res.status(404).json({ message: "Club not found" });

    const { userId } = req.params;
    const isSelf = userId === adminId.toString();

    if (!isSelf && !isAdminOf(club, adminId) && req.user.role !== "hod") {
      return res.status(403).json({ message: "Only club admins can remove members" });
    }

    if (userId === club.createdBy.toString()) {
      return res.status(400).json({ message: "The club founder cannot be removed" });
    }

    club.members = club.members.filter((m) => m.user.toString() !== userId);
    club.admins = club.admins.filter((a) => a.toString() !== userId);
    club.markModified('members');
    club.markModified('admins');
    await club.save();

    const populated = await populateClub(Club.findById(club._id));
    res.json(populated);
  } catch (err) {
    console.error("Remove member error:", err);
    res.status(500).json({ message: "Failed to remove member" });
  }
};

// ─── Update a member's leadership role ──────────────────────────────────────────────────
export const updateMemberRole = async (req, res) => {
  try {
    const club = await Club.findById(req.params.id);
    const adminId = req.user._id || req.user.id;

    if (!club) return res.status(404).json({ message: "Club not found" });

    if (!isAdminOf(club, adminId) && req.user.role !== "hod") {
      return res.status(403).json({ message: "Only club admins can assign leadership roles" });
    }

    const { userId } = req.params;
    const { role, makeAdmin } = req.body;

    if (role && !ROLES.includes(role)) {
      return res.status(400).json({ message: `Role must be one of: ${ROLES.join(", ")}` });
    }

    const member = club.members.find((m) => m.user.toString() === userId);
    if (!member) return res.status(404).json({ message: "User is not a member of this club" });

    if (role) member.role = role;

    if (makeAdmin === true && !club.admins.some((a) => a.toString() === userId)) {
      club.admins.push(userId);
    } else if (makeAdmin === false) {
      club.admins = club.admins.filter((a) => a.toString() !== userId);
    }

    club.markModified('members');
    club.markModified('admins');
    await club.save();
    
    const populated = await populateClub(Club.findById(club._id));
    res.json(populated);
  } catch (err) {
    console.error("Update member role error:", err);
    res.status(500).json({ message: "Failed to update member role" });
  }
};

// ─── Link an existing event to a club ──────────────────────────────────────────────────
export const linkEventToClub = async (req, res) => {
  try {
    const club = await Club.findById(req.params.id);
    const adminId = req.user._id || req.user.id;

    if (!club) return res.status(404).json({ message: "Club not found" });

    if (!isAdminOf(club, adminId) && req.user.role !== "hod") {
      return res.status(403).json({ message: "Only club admins can link events" });
    }

    const { eventId } = req.body;
    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: "A valid eventId is required" });
    }

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (!club.events.some((e) => e.toString() === eventId)) {
      club.events.push(eventId);
      club.markModified('events');
      await club.save();
    }

    event.organization = club.name;
    await event.save();

    const populated = await populateClub(Club.findById(club._id));
    res.json(populated);
  } catch (err) {
    console.error("Link event error:", err);
    res.status(500).json({ message: "Failed to link event to club" });
  }
};

// ─── Unlink an event from a club ────────────────────────────────────────────────────────
export const unlinkEventFromClub = async (req, res) => {
  try {
    const club = await Club.findById(req.params.id);
    const adminId = req.user._id || req.user.id;

    if (!club) return res.status(404).json({ message: "Club not found" });

    if (!isAdminOf(club, adminId) && req.user.role !== "hod") {
      return res.status(403).json({ message: "Only club admins can unlink events" });
    }

    const { eventId } = req.params;
    club.events = club.events.filter((e) => e.toString() !== eventId);
    club.markModified('events');
    await club.save();

    const populated = await populateClub(Club.findById(club._id));
    res.json(populated);
  } catch (err) {
    console.error("Unlink event error:", err);
    res.status(500).json({ message: "Failed to unlink event from club" });
  }
};

// ─── Get events for a club ───────────────────────────────────────────────────────────────
export const getClubEvents = async (req, res) => {
  try {
    const club = await Club.findById(req.params.id).populate({
      path: "events",
      options: { sort: { date: 1 } },
    });
    if (!club) return res.status(404).json({ message: "Club not found" });

    res.json(club.events);
  } catch (err) {
    console.error("Get club events error:", err);
    res.status(500).json({ message: "Failed to fetch club events" });
  }
};
// ─── Post an Announcement ──────────────────────────────────────────────────────────
export const addAnnouncement = async (req, res) => {
  try {
    const club = await Club.findById(req.params.id);
    const userId = req.user._id || req.user.id;

    if (!club) return res.status(404).json({ message: "Club not found" });

    if (!isAdminOf(club, userId) && req.user.role !== "hod") {
      return res.status(403).json({ message: "Only club admins can post announcements" });
    }

    if (!req.body.message) {
      return res.status(400).json({ message: "Message text is required" });
    }

    club.announcements.unshift({
      message: req.body.message,
      postedBy: userId
    });
    
    club.markModified('announcements');
    await club.save();

    const populated = await populateClub(Club.findById(club._id));
    res.status(201).json(populated);
  } catch (err) {
    console.error("Add announcement error:", err);
    res.status(500).json({ message: "Failed to post announcement" });
  }
};

// ─── Delete an Announcement ────────────────────────────────────────────────────────
export const deleteAnnouncement = async (req, res) => {
  try {
    const club = await Club.findById(req.params.id);
    const userId = req.user._id || req.user.id;

    if (!club) return res.status(404).json({ message: "Club not found" });

    if (!isAdminOf(club, userId) && req.user.role !== "hod") {
      return res.status(403).json({ message: "Only club admins can delete announcements" });
    }

    club.announcements = club.announcements.filter(
      (a) => a._id.toString() !== req.params.announcementId
    );
    
    club.markModified('announcements');
    await club.save();

    const populated = await populateClub(Club.findById(club._id));
    res.json(populated);
  } catch (err) {
    console.error("Delete announcement error:", err);
    res.status(500).json({ message: "Failed to delete announcement" });
  }
};