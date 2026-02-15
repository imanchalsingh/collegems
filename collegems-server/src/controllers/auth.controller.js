import User from "../models/User.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const COLLEGE_DOMAIN = "@college.edu";

const generateToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

export const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      studentId,
      teacherId,
      department,
      departmentCode,
      semester,
      course,
    } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "All fields required" });
    }

    // Role-specific checks
    let userData = {
      name,
      email,
      password: await bcrypt.hash(password, 10),
      role,
    };

    if (role === "student") {
      if (!studentId) {
        return res.status(400).json({ message: "Student ID required" });
      }
      if (!semester || !course) {
        return res
          .status(400)
          .json({ message: "Semester and course required for student" });
      }

      userData = { ...userData, studentId, semester, course };
    }

    if (role === "teacher") {
      if (!teacherId) {
        return res.status(400).json({ message: "Teacher ID required" });
      }
      if (!department) {
        return res.status(400).json({ message: "Department required" });
      }
      userData = { ...userData, teacherId, department };
    }

    if (role === "hod") {
      if (!email.endsWith(COLLEGE_DOMAIN)) {
        return res.status(403).json({ message: "Use college email only" });
      }
      if (!departmentCode) {
        return res
          .status(400)
          .json({ message: "Department code required for HOD" });
      }
      userData = { ...userData, departmentCode };
    }

    // Check existing user
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "User already exists" });

    // Create user
    const user = await User.create(userData);

    res.status(201).json({
      message: "Registered successfully",
      user: { id: user._id, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
      },
    });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};
