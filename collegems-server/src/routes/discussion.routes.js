import express from "express";
import { authenticate, restrictTo } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";
import {
  createQuestion,
  getQuestions,
  getQuestion,
  deleteQuestion,
  pinQuestion,
  voteQuestion,
  submitAnswer,
  deleteAnswer,
  acceptAnswer,
  voteAnswer
} from "../controllers/discussion.controller.js";

const router = express.Router();

router.use(authenticate);

// --- QUESTION ROUTES ---
router.get("/questions", getQuestions);
router.post("/questions", createQuestion);
router.get("/questions/:id", getQuestion);
router.delete("/questions/:id", deleteQuestion);
router.put("/questions/:id/pin", authorize("teacher", "hod"), pinQuestion);
router.put("/questions/:id/vote", voteQuestion);

// --- ANSWER ROUTES ---
router.post("/questions/:questionId/answers", submitAnswer);
router.delete("/answers/:answerId", deleteAnswer);
router.put("/answers/:answerId/accept", acceptAnswer);
router.put("/answers/:answerId/vote", voteAnswer);

export default router;
