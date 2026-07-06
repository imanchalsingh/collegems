import mongoose from "mongoose";

const eligibilityRuleSchema = new mongoose.Schema({
  module: { 
    type: String, 
    required: true, 
    enum: ['ExamForm', 'Library', 'Placement', 'Event', 'StudyGroup'] 
  },
  type: { 
    type: String, 
    required: true, 
    enum: ['ATTENDANCE', 'FEE_DUE', 'DISCIPLINARY', 'CGPA'] 
  },
  threshold: { 
    type: Number 
  },
  comparison: { 
    type: String, 
    enum: ['>=', '<=', '==', '>', '<'] 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  message: { 
    type: String, 
    required: true 
  }
}, { timestamps: true });

// Ensure unique active rule per module and type
eligibilityRuleSchema.index({ module: 1, type: 1 }, { unique: true, partialFilterExpression: { isActive: true } });

export default mongoose.model("EligibilityRule", eligibilityRuleSchema);
