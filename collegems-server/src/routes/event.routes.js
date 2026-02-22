import express from "express";
import {
  createEvent,
  deleteEvent,
  getAllEvents,
  getEventById,
  updateEvent,
} from "../controllers/event.controller.js";

const router = express.Router();

// Create a new event
router.post("/", createEvent);
// Get all events
router.get("/", getAllEvents);
// Get a specific event by ID
router.get("/:id", getEventById);
// Update an event by ID
router.put("/:id", updateEvent);
// Delete an event by ID
router.delete("/:id", deleteEvent);

export default router;