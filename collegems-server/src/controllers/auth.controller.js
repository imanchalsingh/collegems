import User from "../models/User.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const ADMIN_SECRET = "SCMS_ADMIN_2026";
const COLLEGE_DOMAIN = "@college.edu";

const generateToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

export const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      studentId,
      teacherId,
      departmentCode,
      adminSecret
    } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "All fields required" });
    }

    if (role === "student" && !studentId) {
      return res.status(400).json({ message: "Student ID required" });
    }

    if (role === "teacher" && !teacherId) {
      return res.status(400).json({ message: "Teacher ID required" });
    }

    if (role === "hod") {
      if (!email.endsWith(COLLEGE_DOMAIN)) {
        return res.status(403).json({ message: "Use college email only" });
      }
      if (!departmentCode) {
        return res.status(400).json({ message: "Department code required" });
      }
    }

    if (role === "admin") {
      if (adminSecret !== ADMIN_SECRET) {
        return res.status(403).json({ message: "Invalid admin secret" });
      }
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    await User.create({
      name,
      email,
      password: hashed,
      role,
      studentId,
      teacherId,
      departmentCode
    });

    res.status(201).json({ message: "Registered successfully" });
  } catch (err) {
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
        role: user.role
      }
    });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};
