import mongoose from "mongoose";

const SystemLogSchema = new mongoose.Schema({
  level: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  correlationId: {
    type: String,
    index: true,
  },
  service: {
    type: String,
    required: true,
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  }
}, { timestamps: false, capped: { size: 5242880, max: 10000 } }); // 5MB limit, max 10k logs

export default mongoose.model("SystemLog", SystemLogSchema);
