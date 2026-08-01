import Alumni from "../models/Alumni.model.js";
import User from "../models/User.model.js";
import Mentorship from "../models/Mentorship.model.js";
import Notification from "../models/Notification.model.js";

export const getAlumni = async (req, res, next) => {
  try {
    const {
      batch,
      department,
      search,
      skills,
      industry,
      location,
      company,
      openToMentorship,
    } = req.query;

    const query = {};
    if (batch) query.batch = batch;
    if (department) query.department = department;
    if (industry) query.industry = { $regex: industry, $options: "i" };
    if (location) query.location = { $regex: location, $options: "i" };
    if (company) query.currentCompany = { $regex: company, $options: "i" };
    if (skills) query.skills = { $in: skills.split(",") };
    if (openToMentorship === "true") query.openToMentorship = true;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { currentCompany: { $regex: search, $options: "i" } },
        { designation: { $regex: search, $options: "i" } },
        { industry: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
      ];
    }

    const alumniList = await Alumni.find(query).sort({ batch: -1, name: 1 });

    res.json({
      success: true,
      data: alumniList,
    });
  } catch (error) {
    next(error);
  }
};

export const seedAlumni = async (req, res, next) => {
  try {
    const count = await Alumni.countDocuments();
    if (count === 0) {
      await Alumni.insertMany([
        {
          name: "John Doe",
          email: "john.doe@example.com",
          batch: "2020",
          department: "Computer Science",
          currentCompany: "Google",
          designation: "Software Engineer",
          industry: "Technology",
          location: "Bengaluru",
          linkedInUrl: "https://linkedin.com/in/johndoe",
          openToMentorship: true,
          isVerified: true,
        },
        {
          name: "Jane Smith",
          email: "jane.smith@example.com",
          batch: "2021",
          department: "Electrical Engineering",
          currentCompany: "Tesla",
          designation: "Hardware Engineer",
          industry: "Automotive",
          location: "Pune",
          linkedInUrl: "https://linkedin.com/in/janesmith",
          openToMentorship: true,
          isVerified: true,
        },
        {
          name: "Alice Johnson",
          email: "alice.j@example.com",
          batch: "2019",
          department: "Computer Science",
          currentCompany: "Microsoft",
          designation: "Senior Developer",
          industry: "Technology",
          location: "Hyderabad",
          linkedInUrl: "https://linkedin.com/in/alicej",
          openToMentorship: true,
          isVerified: true,
        },
        {
          name: "Bob Brown",
          email: "bob.b@example.com",
          batch: "2022",
          department: "Mechanical Engineering",
          currentCompany: "Ford",
          designation: "Design Engineer",
          industry: "Manufacturing",
          location: "Chennai",
          linkedInUrl: "https://linkedin.com/in/bobbrown",
          openToMentorship: false,
          isVerified: true,
        },
      ]);
    }
    res.json({ success: true, message: "Mock alumni seeded if not present" });
  } catch (error) {
    next(error);
  }
};

export const updateAlumniProfile = async (req, res, next) => {
  try {
    const {
      batch,
      department,
      currentCompany,
      designation,
      industry,
      location,
      linkedInUrl,
      skills,
      achievements,
      experience,
      openToMentorship,
    } = req.body;

    let alumni = await Alumni.findOne({ userId: req.user.id });

    if (!alumni) {
      const user = await User.findById(req.user.id);
      alumni = new Alumni({
        name: user.name,
        email: user.email,
        userId: req.user.id,
        batch: batch || "N/A",
        department: department || "N/A",
      });
    }

    if (batch) alumni.batch = batch;
    if (department) alumni.department = department;
    if (currentCompany) alumni.currentCompany = currentCompany;
    if (designation) alumni.designation = designation;
    if (industry !== undefined) alumni.industry = industry;
    if (location !== undefined) alumni.location = location;
    if (linkedInUrl) alumni.linkedInUrl = linkedInUrl;
    if (skills) alumni.skills = skills;
    if (achievements) alumni.achievements = achievements;
    if (experience) alumni.experience = experience;
    if (typeof openToMentorship === "boolean") {
      alumni.openToMentorship = openToMentorship;
    }

    await alumni.save();

    res.json({ success: true, data: alumni });
  } catch (error) {
    next(error);
  }
};

export const requestAlumniMentorship = async (req, res, next) => {
  try {
    const { alumniId } = req.params;
    const { note } = req.body;

    if (req.user.role !== "student") {
      return res.status(403).json({
        success: false,
        message: "Only students can request alumni mentorship",
      });
    }

    const alumni = await Alumni.findById(alumniId);
    if (!alumni) {
      return res.status(404).json({
        success: false,
        message: "Alumni profile not found",
      });
    }

    if (!alumni.openToMentorship) {
      return res.status(400).json({
        success: false,
        message: "This alumni is not accepting mentorship requests",
      });
    }

    if (!alumni.userId) {
      return res.status(400).json({
        success: false,
        message:
          "This alumni is not linked to a login account yet. Try email connect instead.",
      });
    }

    const existing = await Mentorship.findOne({
      mentor: alumni.userId,
      mentee: req.user.id,
      status: { $in: ["pending", "active"] },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "You already have a pending or active request with this alumni",
        data: existing,
      });
    }

    const student = await User.findById(req.user.id).select("name");
    const mentorship = await Mentorship.create({
      mentor: alumni.userId,
      mentee: req.user.id,
      status: "pending",
      note: note?.trim() || "Mentorship request via Alumni Portal",
      source: "alumni_request",
    });

    await Notification.create({
      recipient: alumni.userId,
      type: "general",
      message: `${student?.name || "A student"} requested mentorship via Alumni Portal`,
    }).catch(() => null);

    res.status(201).json({
      success: true,
      message: "Mentorship request sent",
      data: mentorship,
    });
  } catch (error) {
    next(error);
  }
};
