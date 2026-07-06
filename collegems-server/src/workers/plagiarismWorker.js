import { subscribeEvent } from "../utils/rabbitmq.js";
import mongoose from "mongoose";
import Assignment from "../models/Assignment.model.js";
import PlagiarismReport from "../models/PlagiarismReport.model.js";
import { getSubmissionText } from "../utils/textExtraction.js";
import { compareTexts } from "../utils/similarity.js";

const DEFAULT_THRESHOLD = 40;
const MIN_REPORTED_SIMILARITY = 1;

/**
 * Background worker to process plagiarism checking when an assignment is submitted.
 * It compares the new submission against all previous submissions for this assignment,
 * and then optionally across older assignments.
 */
export const startPlagiarismWorker = () => {
  subscribeEvent("academics", "plagiarism_queue", "assignment.submitted", async (data) => {
    try {
      console.log(`🔍 [PlagiarismWorker] Processing submission for Student ${data.studentId} on Assignment ${data.assignmentId}`);
      const assignment = await Assignment.findById(data.assignmentId);
      if (!assignment) return;

      const submission = assignment.submissions.find(s => s.student.toString() === data.studentId.toString());
      if (!submission) return;

      // Extract text from the new submission
      const { text, sourceType, extractionNote } = await getSubmissionText(submission);
      
      if (!text || text.length === 0) {
        console.log(`[PlagiarismWorker] No text extracted for Student ${data.studentId}. Skipping comparison.`);
        return;
      }

      const matches = [];

      // Compare against other submissions in the same assignment
      for (const other of assignment.submissions) {
        if (other.student.toString() === data.studentId.toString()) continue;
        
        const otherTextData = await getSubmissionText(other);
        const result = compareTexts(text, otherTextData.text);
        
        if (result && result.similarity >= MIN_REPORTED_SIMILARITY) {
          matches.push({
            matchType: "same_assignment",
            sourceAssignment: assignment._id,
            sourceAssignmentTitle: assignment.title,
            matchedStudent: other.student,
            matchedStudentName: "Student", // We would normally populate this
            academicYear: "Current",
            similarityPercentage: result.similarity,
            matchedSections: result.matchedSections,
          });
        }
      }

      matches.sort((a, b) => b.similarityPercentage - a.similarityPercentage);
      const topMatches = matches.slice(0, 5);
      const overallSimilarity = topMatches.length ? topMatches[0].similarityPercentage : 0;
      const flagged = overallSimilarity >= DEFAULT_THRESHOLD;

      await PlagiarismReport.findOneAndUpdate(
        { assignment: assignment._id, student: data.studentId },
        {
          assignment: assignment._id,
          student: data.studentId,
          sourceType,
          extractedCharacterCount: text.length,
          extractionNote: extractionNote || "",
          overallSimilarity,
          threshold: DEFAULT_THRESHOLD,
          flagged,
          matches: topMatches,
          status: "pending_review",
          checkedAt: new Date()
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      console.log(`✅ [PlagiarismWorker] Finished processing. Max Similarity: ${overallSimilarity}%`);
    } catch (err) {
      console.error(`❌ [PlagiarismWorker] Error processing plagiarism check:`, err.message);
    }
  });
};
