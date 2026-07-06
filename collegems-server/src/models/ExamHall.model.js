import mongoose from "mongoose";

const examHallSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Hall name is required"],
      trim: true,
    },
    building: {
      type: String,
      required: [true, "Building name is required"],
      trim: true,
    },
    floor: {
      type: Number,
      required: true,
      default: 0,
    },
    capacity: {
      type: Number,
      required: [true, "Seating capacity is required"],
      min: [1, "Capacity must be at least 1"],
    },
    rows: {
      type: Number,
      required: true,
      min: [1, "Must have at least 1 row"],
    },
    columns: {
      type: Number,
      required: true,
      min: [1, "Must have at least 1 column"],
    },
    facilities: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

examHallSchema.index({ name: 1, building: 1 }, { unique: true });

examHallSchema.pre("validate", function () {
  if (this.rows && this.columns) {
    this.capacity = this.rows * this.columns;
  }
});

export default mongoose.model("ExamHall", examHallSchema);
