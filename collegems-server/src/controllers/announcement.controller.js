import Announcement from "../models/Announcement.model.js";
import AnnouncementRead from "../models/AnnouncementRead.model.js";
import User from "../models/User.model.js";
import { sendNotification } from "../utils/notification.util.js";

const VALID_PRIORITIES = ['low', 'medium', 'high'];
const VALID_STATUSES = ['draft', 'published'];

function validatePriority(priority) {
    if (priority === undefined || priority === null) return { valid: true };
    if (typeof priority !== 'string') {
        return {
            valid: false,
            error: 'Priority must be a string'
        };
    }
    const trimmed = priority.trim().toLowerCase();
    if (!VALID_PRIORITIES.includes(trimmed)) {
        return {
            valid: false,
            error: `Priority must be one of: ${VALID_PRIORITIES.join(', ')}`
        };
    }
    return { valid: true, value: trimmed };
}

function validateStatus(status) {
    if (status === undefined || status === null) return { valid: true };
    if (typeof status !== 'string') {
        return {
            valid: false,
            error: 'Status must be a string'
        };
    }
    const trimmed = status.trim().toLowerCase();
    if (!VALID_STATUSES.includes(trimmed)) {
        return {
            valid: false,
            error: `Status must be one of: ${VALID_STATUSES.join(', ')}`
        };
    }
    return { valid: true, value: trimmed };
}

export const createAnnouncement = async (req, res) => {
  try {
    const {
      title,
      message,
      targetRole,
      targetCourse,
      targetSemester,
      expiresAt,
      priority,
      status,
      isSilent,
    } = req.body;

    const priorityValidation = validatePriority(priority);
    if (!priorityValidation.valid) {
      return res.status(400).json({
        success: false,
        message: priorityValidation.error
      });
    }

    if (status && !["draft", "published"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be 'draft' or 'published'",
      });
    }

    const announcementStatus = status || "published";
    const finalPriority = priorityValidation.value || "medium";

    const announcement = new Announcement({
      title,
      message,
      postedBy: req.user.id,
      targetRole: targetRole || "all",
      targetCourse: targetCourse || null,
      targetSemester: targetSemester || null,
      expiresAt: expiresAt || null,
      priority: finalPriority,
      status: announcementStatus,
      isSilent: isSilent || false,
    });

    await announcement.save();

    const populated = await Announcement.findById(announcement._id).populate(
      "postedBy",
      "name email role"
    );

    if (announcementStatus === "published" && !isSilent) {
      const query = { accountStatus: "active" };
      if (targetRole && targetRole !== "all") query.role = targetRole;
      if (targetCourse) query.course = targetCourse;
      if (targetSemester) query.semester = targetSemester;
      
      User.find(query).select("_id").then(users => {
        if (users.length > 0) {
          Promise.allSettled(
            users.map(u => sendNotification(req.app, u._id, "announcement", `New Announcement: ${title}`))
          ).catch(err => console.error("Notification dispatch error:", err));
        }
      }).catch(err => console.error("Error finding target users:", err));
    }

    res.status(201).json({
      success: true,
      message: announcementStatus === "draft"
        ? "Announcement saved as draft"
        : "Announcement published successfully",
      data: populated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyAnnouncements = async (req, res) => {
  try {
    const { role, course, semester } = req.user;

    const now = new Date();

    const filter = {
      isActive: true,
      $and: [
        { $or: [{ status: "published" }, { status: { $exists: false } }] },
        { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
        { $or: [{ targetRole: "all" }, { targetRole: role }] },
        {
          $or: [
            { targetCourse: null },
            { targetCourse: course || "__none__" },
          ],
        },
        {
          $or: [
            { targetSemester: null },
            { targetSemester: semester?.toString() || "__none__" },
          ],
        },
      ],
    };

    const announcements = await Announcement.find(filter)
      .populate("postedBy", "name role")
      .sort({ priority: -1, createdAt: -1 });

    const readRecords = await AnnouncementRead.find({
      user: req.user.id,
      announcement: { $in: announcements.map((a) => a._id) },
    }).select("announcement");

    const readSet = new Set(readRecords.map((r) => r.announcement.toString()));

    const withReadStatus = announcements.map((a) => ({
      ...a.toObject(),
      isRead: readSet.has(a._id.toString()),
    }));

    res.status(200).json({
      success: true,
      count: announcements.length,
      data: withReadStatus,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllAnnouncements = async (req, res) => {
  try {
    const { targetRole, targetCourse, targetSemester, isActive, status } =
      req.query;

    const filter = {};
    if (targetRole) filter.targetRole = targetRole;
    if (targetCourse) filter.targetCourse = targetCourse;
    if (targetSemester) filter.targetSemester = targetSemester;
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (status) filter.status = status;

    const visibilityFilter = {
      $or: [
        { status: "published" },
        { status: { $exists: false } },
        { postedBy: req.user.id }
      ]
    };

    const finalFilter = {
      ...filter,
      ...visibilityFilter,
    };

    const announcements = await Announcement.find(finalFilter)
      .populate("postedBy", "name email role")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: announcements.length,
      data: announcements,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAnnouncementById = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id).populate(
      "postedBy",
      "name email role"
    );

    if (!announcement) {
      return res
        .status(404)
        .json({ success: false, message: "Announcement not found" });
    }

    res.status(200).json({ success: true, data: announcement });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const markAnnouncementRead = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res
        .status(404)
        .json({ success: false, message: "Announcement not found" });
    }

    const result = await AnnouncementRead.findOneAndUpdate(
      { announcement: announcement._id, user: req.user.id },
      { $setOnInsert: { announcement: announcement._id, user: req.user.id, readAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({
      success: true,
      message: "Marked as read",
      data: { announcementId: announcement._id, readAt: result.readAt },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(200).json({ success: true, message: "Marked as read" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAnnouncementReadStats = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res
        .status(404)
        .json({ success: false, message: "Announcement not found" });
    }

    if (
      req.user.role === "teacher" &&
      announcement.postedBy.toString() !== req.user.id
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Access denied" });
    }

    const totalReaders = await AnnouncementRead.countDocuments({
      announcement: announcement._id,
    });

    const ownRead = await AnnouncementRead.findOne({
      announcement: announcement._id,
      user: req.user.id,
    });

    const readers = await AnnouncementRead.find({ announcement: announcement._id })
      .populate("user", "name email role")
      .sort({ readAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        announcementId: announcement._id,
        totalReaders,
        isReadByMe: Boolean(ownRead),
        readAt: ownRead?.readAt || null,
        readers: readers.map((r) => ({
          user: r.user,
          readAt: r.readAt,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res
        .status(404)
        .json({ success: false, message: "Announcement not found" });
    }

    if (
      req.user.role === "teacher" &&
      announcement.postedBy.toString() !== req.user.id
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Access denied" });
    }

    if (req.body.status && !["draft", "published"].includes(req.body.status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be 'draft' or 'published'",
      });
    }

    if (req.body.priority !== undefined) {
      const priorityValidation = validatePriority(req.body.priority);
      if (!priorityValidation.valid) {
        return res.status(400).json({
          success: false,
          message: priorityValidation.error
        });
      }
    }

    const allowed = [
      "title",
      "message",
      "targetRole",
      "targetCourse",
      "targetSemester",
      "expiresAt",
      "priority",
      "isActive",
      "status",
      "isSilent",
    ];

    const wasDraft = announcement.status === "draft";
    
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) announcement[field] = req.body[field];
    });

    await announcement.save();

    if (wasDraft && announcement.status === "published" && !announcement.isSilent) {
      const query = { accountStatus: "active" };
      if (announcement.targetRole && announcement.targetRole !== "all") query.role = announcement.targetRole;
      if (announcement.targetCourse) query.course = announcement.targetCourse;
      if (announcement.targetSemester) query.semester = announcement.targetSemester;
      
      User.find(query).select("_id").then(users => {
        if (users.length > 0) {
          Promise.allSettled(
            users.map(u => sendNotification(req.app, u._id, "announcement", `New Announcement: ${announcement.title}`))
          ).catch(err => console.error("Notification dispatch error:", err));
        }
      }).catch(err => console.error("Error finding target users:", err));
    }

    const updated = await Announcement.findById(announcement._id).populate(
      "postedBy",
      "name email role"
    );

    res.status(200).json({
      success: true,
      message: "Announcement updated",
      data: updated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res
        .status(404)
        .json({ success: false, message: "Announcement not found" });
    }

    if (
      req.user.role === "teacher" &&
      announcement.postedBy.toString() !== req.user.id
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Access denied" });
    }

    await announcement.deleteOne();
    
    await AnnouncementRead.deleteMany({ announcement: announcement._id });
    res.status(200).json({
      success: true,
      message: "Announcement deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};