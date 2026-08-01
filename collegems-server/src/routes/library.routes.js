import express from "express";
import {
  getAllBooks,
  addBook,
  updateBook,
  deleteBook,
  issueBook,
  returnBook,
  getIssueRecords,
  getUserFines,
  payLibraryFine,
  findBookByCode,
  reserveBook,
  getMyReservations,
  cancelReservation,
} from "../controllers/library.controller.js";
import {
  previewFine,
  recalculateFines,
} from "../controllers/libraryFine.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";

const router = express.Router();

router.get("/books", protect, getAllBooks);
router.get("/books/code/:code", protect, findBookByCode);
router.get("/issues", protect, getIssueRecords);

router.post("/books", protect, allowRoles("hod", "teacher"), addBook);
router.put("/books/:id", protect, allowRoles("hod", "teacher"), updateBook);
router.delete("/books/:id", protect, allowRoles("hod", "teacher"), deleteBook);
router.post("/issue", protect, allowRoles("hod", "teacher"), issueBook);
router.post("/return/:issueId", protect, allowRoles("hod", "teacher"), returnBook);

router.get("/fines", protect, getUserFines);
router.get("/fines/preview/:issueId", protect, allowRoles("hod", "teacher"), previewFine);
router.post("/fines/recalculate", protect, allowRoles("hod", "teacher"), recalculateFines);
router.post("/fines/:fineId/pay", protect, allowRoles("hod", "teacher"), payLibraryFine);

router.post("/reservations", protect, allowRoles("student"), reserveBook);
router.get("/reservations", protect, getMyReservations);
router.patch("/reservations/:id/cancel", protect, cancelReservation);

export default router;
