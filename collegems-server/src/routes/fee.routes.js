import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import Fee from "../models/Fee.model.js";

const router = express.Router();

// Admin sets fee
router.post(
  "/set",
  protect,
  allowRoles("admin"),
  async (req, res) => {
    const fee = await Fee.create(req.body);
    res.json(fee);
  }
);

// Student views fee
router.get(
  "/me",
  protect,
  allowRoles("student"),
  async (req, res) => {
    const fee = await Fee.findOne({ student: req.user.id });
    res.json(fee);
  }
);

export default router;
