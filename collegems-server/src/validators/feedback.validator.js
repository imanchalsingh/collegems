import { body, validationResult } from "express-validator";

export const validateFeedback = [
  body("category")
    .notEmpty()
    .withMessage("Category is required")
    .isIn(["course", "faculty", "facility", "general"])
    .withMessage("Invalid category"),

  body("title")
    .notEmpty()
    .withMessage("Title is required")
    .isString()
    .isLength({ min: 5, max: 100 })
    .withMessage("Title must be between 5 and 100 characters"),

  body("message")
    .notEmpty()
    .withMessage("Message is required")
    .isString()
    .isLength({ min: 10, max: 1000 })
    .withMessage("Message must be between 10 and 1000 characters"),

  body("rating")
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be an integer between 1 and 5"),

  body("isAnonymous")
    .optional()
    .isBoolean()
    .withMessage("isAnonymous must be a boolean value"),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Validation failed",
        errors: errors.array(),
      });
    }
    next();
  },
];
