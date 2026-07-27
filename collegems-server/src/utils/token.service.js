import jwt from "jsonwebtoken";
import crypto from "crypto";

export const generateAccessToken = (user) =>
  jwt.sign(
    {
      id: String(user._id),
      role: user.role,
      course: user.course || null,
      semester: user.semester || null,
      department: user.department || null,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "2h",
    }
  );

export const generateRefreshToken = (user) =>
  jwt.sign(
    { id: String(user._id), role: user.role, jti: crypto.randomUUID() },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: "7d",
    }
  );

export const hashRefreshToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

export const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};
