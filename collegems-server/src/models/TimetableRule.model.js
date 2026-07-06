import mongoose from "mongoose";

const timetableRuleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isHardConstraint: {
      type: Boolean,
      default: false,
    },
    penaltyWeight: {
      type: Number,
      default: 10, // Used for soft constraints
    },
    ruleType: {
      type: String,
      enum: ["faculty_break", "max_consecutive", "preferred_room", "no_overlap", "room_capacity", "lab_requirement"],
      required: true,
    },
    parameters: {
      type: mongoose.Schema.Types.Mixed, // Configurable params like { maxHours: 3 }
      default: {},
    },
  },
  { timestamps: true }
);

export default mongoose.model("TimetableRule", timetableRuleSchema);
