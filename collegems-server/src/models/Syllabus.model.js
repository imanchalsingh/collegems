import mongoose from "mongoose";

const unitSchema = new mongoose.Schema({
  unitName: { type: String, required: true },
  topics: [{ type: String }],
});

const syllabusSchema = new mongoose.Schema(
  {
    courseName: { type: String, required: true },
    semester: { type: String, required: true },
    subjectTitle: { type: String, required: true },
    units: [unitSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

export default mongoose.model("Syllabus", syllabusSchema);
