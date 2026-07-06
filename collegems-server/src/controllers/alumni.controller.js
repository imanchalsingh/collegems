import Alumni from "../models/Alumni.model.js";
import User from "../models/User.model.js";

export const getAlumni = async (req, res, next) => {
  try {
    const { batch, department, search, skills } = req.query;
    
    let query = {};
    if (batch) query.batch = batch;
    if (department) query.department = department;
    if (skills) query.skills = { $in: skills.split(",") };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { currentCompany: { $regex: search, $options: "i" } },
        { designation: { $regex: search, $options: "i" } }
      ];
    }

    const alumniList = await Alumni.find(query).sort({ batch: -1, name: 1 });
    
    res.json({
      success: true,
      data: alumniList
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
          linkedInUrl: "https://linkedin.com/in/johndoe"
        },
        {
          name: "Jane Smith",
          email: "jane.smith@example.com",
          batch: "2021",
          department: "Electrical Engineering",
          currentCompany: "Tesla",
          designation: "Hardware Engineer",
          linkedInUrl: "https://linkedin.com/in/janesmith"
        },
        {
          name: "Alice Johnson",
          email: "alice.j@example.com",
          batch: "2019",
          department: "Computer Science",
          currentCompany: "Microsoft",
          designation: "Senior Developer",
          linkedInUrl: "https://linkedin.com/in/alicej"
        },
        {
          name: "Bob Brown",
          email: "bob.b@example.com",
          batch: "2022",
          department: "Mechanical Engineering",
          currentCompany: "Ford",
          designation: "Design Engineer",
          linkedInUrl: "https://linkedin.com/in/bobbrown"
        }
      ]);
    }
    res.json({ success: true, message: "Mock alumni seeded if not present" });
  } catch (error) {
    next(error);
  }
};

export const updateAlumniProfile = async (req, res, next) => {
  try {
    const { batch, department, currentCompany, designation, linkedInUrl, skills, achievements, experience } = req.body;

    let alumni = await Alumni.findOne({ userId: req.user.id });

    if (!alumni) {
      // Create if it doesn't exist
      const user = await User.findById(req.user.id);
      alumni = new Alumni({
        name: user.name,
        email: user.email,
        userId: req.user.id,
      });
    }

    if (batch) alumni.batch = batch;
    if (department) alumni.department = department;
    if (currentCompany) alumni.currentCompany = currentCompany;
    if (designation) alumni.designation = designation;
    if (linkedInUrl) alumni.linkedInUrl = linkedInUrl;
    if (skills) alumni.skills = skills;
    if (achievements) alumni.achievements = achievements;
    if (experience) alumni.experience = experience;

    await alumni.save();

    res.json({ success: true, data: alumni });
  } catch (error) {
    next(error);
  }
};
