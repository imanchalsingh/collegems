import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema(
  {
    comments: [
      {
        user: { 
          type: mongoose.Schema.Types.ObjectId, 
          ref: 'User', 
          required: true 
        },
        text: { 
          type: String, 
          required: true 
        },
        createdAt: { 
          type: Date, 
          default: Date.now 
        }
      }
    ],
    title: String,
    description: String,
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course"
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    dueDate: Date,
    totalPoints: Number,
    submissionType: {
      type: String,
      enum: ["file", "text", "link", "both"],
      default: "file"
    },
    instructionsFile: String,
    validationRules: {
      maxFileSizeMB: { type: Number, default: 5 },
      allowedFileTypes: { 
        type: [String], 
        default: [
          "application/pdf", 
          "application/msword", 
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "image/jpeg",
          "image/png"
        ] 
      },
      minTextLength: { type: Number, default: 10 }
    },
    submissions: [
      {
        student: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        },
        submittedAt: Date,
        status: {
        type: String,
        enum: ['draft', 'submitted', 'graded'],
         default: 'submitted'
},
        textResponse: String,
        link: String,
        file: {
          url: String,
          originalName: String,
          mimeType: String,
          size: Number,
          filename: String
        },
        marks: Number
      }
    ]
  },
  { timestamps: true }
);

assignmentSchema.index({ title: "text", description: "text" });

export default mongoose.model("Assignment", assignmentSchema);
/**
 * POST /api/assignment/:id/comments
 * Adds a public comment/question to an assignment
 */
export const addAssignmentComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    
    if (!text || text.trim() === "") {
      return res.status(400).json({ message: "Comment text is required" });
    }

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    // Add the comment
    assignment.comments.push({
      user: req.user.id,
      text: text.trim()
    });

    await assignment.save();

    // Fetch the newly saved assignment and populate the user details for the UI
    const updatedAssignment = await Assignment.findById(id).populate(
      "comments.user", 
      "name role avatarUrl photo"
    );

    res.status(201).json({ 
      success: true, 
      data: updatedAssignment.comments 
    });
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ message: "Failed to add comment" });
  }
};