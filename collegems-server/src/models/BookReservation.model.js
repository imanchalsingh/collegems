import mongoose from "mongoose";

const bookReservationSchema = new mongoose.Schema(
  {
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["queued", "notified", "fulfilled", "cancelled", "expired"],
      default: "queued",
      index: true,
    },
    position: { type: Number, default: 0 },
    notifiedAt: { type: Date },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

bookReservationSchema.index({ book: 1, user: 1, status: 1 });

export default mongoose.model("BookReservation", bookReservationSchema);
