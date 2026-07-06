import express from "express";
import {
  getAllResources,
  createResource,
  updateResource,
  deleteResource,
} from "../controllers/resource.controller.js";
import { authenticate, restrictTo } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(authenticate);

router
  .route("/")
  .get(getAllResources)
  .post(restrictTo("hod"), createResource);

router
  .route("/:id")
  .put(restrictTo("hod"), updateResource)
  .delete(restrictTo("hod"), deleteResource);

export default router;
