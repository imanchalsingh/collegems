import { body, validationResult } from "express-validator";

export const validateRegister = [
  body("email")
    .isEmail()
    .withMessage("Invalid email address")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[A-Z])(?=.*[0-9])/)
    .withMessage("Password must contain at least one uppercase letter and one number"),
  body("name")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters")
    .escape(),
  body("role")
    .isIn(["student", "teacher", "parent", "hod"])
    .withMessage("Role must be one of: student, teacher, parent, hod"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];
