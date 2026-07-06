import dotenv from "dotenv";

dotenv.config();

import mongoose from "mongoose";
import { hashPassword } from "./utils/hashPassword.js";

import User from "./models/User.model.js";
import Course from "./models/Course.model.js";

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB Connected");

    // remove old demo users if they exist
    await User.deleteMany({
      email: {
        $in: [
          "student@example.com",
          "teacher@example.com",
          "hod@college.edu",
        ],
      },
    });

    const hashedPassword = await hashPassword("password123", 10);

    await User.create([
      {
        name: "Demo Student",
        email: "student@example.com",
        password: hashedPassword,
        role: "student",
        studentId: "STU001",
        semester: "6",
        course: "Computer Science",
      },
      {
        name: "Demo Teacher",
        email: "teacher@example.com",
        password: hashedPassword,
        role: "teacher",
        teacherId: "TCH001",
        department: "Computer Science",
      },
      {
        name: "Demo HOD",
        email: "hod@college.edu",
        password: hashedPassword,
        role: "hod",
        departmentCode: "CSE",
      },
    ]);

    console.log("Demo users created successfully");

    // Clear old courses
    await Course.deleteMany({ code: "CS101" });

    // Create a demo course
    const teacher = await User.findOne({ email: "teacher@example.com" });
    await Course.create({
      name: "Introduction to Computer Science",
      code: "CS101",
      department: "Computer Science",
      semester: 6,
      teacher: teacher._id,
      credits: 4,
    });

    console.log("Demo course created successfully");

    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

seedData();