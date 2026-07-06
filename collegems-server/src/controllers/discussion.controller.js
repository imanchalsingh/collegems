import DiscussionQuestion from "../models/DiscussionQuestion.model.js";
import DiscussionAnswer from "../models/DiscussionAnswer.model.js";
import Notification from "../models/Notification.model.js";
import mongoose from "mongoose";

// --- QUESTION CONTROLLERS ---

export const createQuestion = async (req, res, next) => {
  try {
    const { title, content, tags, department } = req.body;
    const question = new DiscussionQuestion({
      title,
      content,
      tags,
      department,
      author: req.user.id,
    });
    await question.save();
    res.status(201).json({ success: true, data: question });
  } catch (error) {
    next(error);
  }
};

export const getQuestions = async (req, res, next) => {
  try {
    const { search, tags, department, sortBy } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
      ];
    }
    if (tags) {
      query.tags = { $in: tags.split(",") };
    }
    if (department) {
      query.department = department;
    }

    // Sort options: recent, popular (votes), views
    let sortOptions = { isPinned: -1, createdAt: -1 }; // Pinned always first
    if (sortBy === "popular") {
      // Approximate popular by using upvotedBy length (can't directly sort by array length easily in Mongoose without aggregation)
      // For Phase 1, we'll fetch and sort in memory if 'popular' is selected (acceptable for small datasets), or use a simple createdAt sort
      // We will just use createdAt for the basic query and sort after if needed, or stick to recent.
      // A better approach in Mongoose 6+ is to add a pre-save hook to maintain a `netVotes` field, but we'll use aggregation if needed.
    }

    // For simplicity, sticking to recent sort
    const questions = await DiscussionQuestion.find(query)
      .populate("author", "name role")
      .sort(sortOptions)
      .limit(50); // Pagination deferred

    res.json({ success: true, data: questions });
  } catch (error) {
    next(error);
  }
};

export const getQuestion = async (req, res, next) => {
  try {
    const question = await DiscussionQuestion.findById(req.params.id).populate("author", "name role");
    if (!question) return res.status(404).json({ success: false, message: "Question not found" });

    // Increment views
    question.views += 1;
    await question.save();

    // Fetch answers
    const answers = await DiscussionAnswer.find({ question: question._id })
      .populate("author", "name role")
      .sort({ isAccepted: -1, isPinned: -1, createdAt: 1 });

    res.json({ success: true, data: { question, answers } });
  } catch (error) {
    next(error);
  }
};

export const deleteQuestion = async (req, res, next) => {
  try {
    const question = await DiscussionQuestion.findById(req.params.id);
    if (!question) return res.status(404).json({ success: false, message: "Question not found" });

    // Only author or moderator (teacher/hod) can delete
    if (question.author.toString() !== req.user.id && !["teacher", "hod"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Unauthorized to delete this question" });
    }

    await DiscussionQuestion.findByIdAndDelete(req.params.id);
    await DiscussionAnswer.deleteMany({ question: req.params.id });

    res.json({ success: true, message: "Question deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const pinQuestion = async (req, res, next) => {
  try {
    const question = await DiscussionQuestion.findById(req.params.id);
    if (!question) return res.status(404).json({ success: false, message: "Question not found" });

    question.isPinned = !question.isPinned;
    await question.save();

    res.json({ success: true, data: question });
  } catch (error) {
    next(error);
  }
};

export const voteQuestion = async (req, res, next) => {
  try {
    const { action } = req.body; // 'upvote' or 'downvote'
    const question = await DiscussionQuestion.findById(req.params.id);
    if (!question) return res.status(404).json({ success: false, message: "Question not found" });

    const userId = req.user.id;

    // Remove user from both arrays first to reset
    question.upvotedBy = question.upvotedBy.filter(id => id.toString() !== userId);
    question.downvotedBy = question.downvotedBy.filter(id => id.toString() !== userId);

    if (action === "upvote") {
      question.upvotedBy.push(userId);
    } else if (action === "downvote") {
      question.downvotedBy.push(userId);
    }

    await question.save();
    res.json({ success: true, data: question });
  } catch (error) {
    next(error);
  }
};

// --- ANSWER CONTROLLERS ---

export const submitAnswer = async (req, res, next) => {
  try {
    const { questionId } = req.params;
    const { content } = req.body;

    const question = await DiscussionQuestion.findById(questionId);
    if (!question) return res.status(404).json({ success: false, message: "Question not found" });

    const answer = new DiscussionAnswer({
      content,
      author: req.user.id,
      question: questionId
    });

    await answer.save();

    // Notify question author if it's someone else answering
    if (question.author.toString() !== req.user.id) {
      await Notification.create({
        recipient: question.author,
        type: "discussion",
        message: `Someone posted a new answer to your question: "${question.title}"`
      });
    }

    res.status(201).json({ success: true, data: answer });
  } catch (error) {
    next(error);
  }
};

export const deleteAnswer = async (req, res, next) => {
  try {
    const answer = await DiscussionAnswer.findById(req.params.answerId);
    if (!answer) return res.status(404).json({ success: false, message: "Answer not found" });

    // Only author or moderator
    if (answer.author.toString() !== req.user.id && !["teacher", "hod"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Unauthorized to delete this answer" });
    }

    await DiscussionAnswer.findByIdAndDelete(req.params.answerId);
    res.json({ success: true, message: "Answer deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const acceptAnswer = async (req, res, next) => {
  try {
    const answer = await DiscussionAnswer.findById(req.params.answerId);
    if (!answer) return res.status(404).json({ success: false, message: "Answer not found" });

    const question = await DiscussionQuestion.findById(answer.question);
    
    if (question.author.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Only the question author can accept an answer" });
    }

    // Toggle accept status
    answer.isAccepted = !answer.isAccepted;
    await answer.save();

    res.json({ success: true, data: answer });
  } catch (error) {
    next(error);
  }
};

export const voteAnswer = async (req, res, next) => {
  try {
    const { action } = req.body; // 'upvote' or 'downvote'
    const answer = await DiscussionAnswer.findById(req.params.answerId);
    if (!answer) return res.status(404).json({ success: false, message: "Answer not found" });

    const userId = req.user.id;

    // Reset votes
    answer.upvotedBy = answer.upvotedBy.filter(id => id.toString() !== userId);
    answer.downvotedBy = answer.downvotedBy.filter(id => id.toString() !== userId);

    if (action === "upvote") {
      answer.upvotedBy.push(userId);
    } else if (action === "downvote") {
      answer.downvotedBy.push(userId);
    }

    await answer.save();
    res.json({ success: true, data: answer });
  } catch (error) {
    next(error);
  }
};
