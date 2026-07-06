import mongoose from "mongoose";

const resourceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["classroom", "lab", "seminar_hall", "projector", "other"],
      required: true,
    },
    capacity: {
      type: Number,
      default: 0,
    },
    location: {
      type: String,
      trim: true,
    },
    features: [
      {
        type: String,
        trim: true,
      },
    ],
    status: {
      type: String,
      enum: ["active", "maintenance", "retired"],
      default: "active",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Resource", resourceSchema);
