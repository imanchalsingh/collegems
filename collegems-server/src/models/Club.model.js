import mongoose from "mongoose";
import ownershipPlugin from "../plugins/ownershipPlugin.js";

const LEADERSHIP_ROLES = [
  "member",
  "coordinator",
  "secretary",
  "treasurer",
  "vice-president",
  "president",
];

const memberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: LEADERSHIP_ROLES,
      default: "member",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const joinRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      trim: true,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const clubSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: [
        "Technical", "Cultural", "Sports", "Literary",
        "Social Service", "Arts", "Music", "Dance",
        "Photography", "Entrepreneurship", "Other",
      ],
      default: "Other",
    },
    logo: {
      type: String,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    admins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    members: [memberSchema],
    pendingRequests: [joinRequestSchema],
   events: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event",
      },
    ],
    
    announcements: [
      {
        message: { type: String, required: true },
        postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        date: { type: Date, default: Date.now }
      }
    ],
    maxMembers: {
      type: Number,
      default: 100,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

clubSchema.index({ "members.user": 1 });
clubSchema.plugin(ownershipPlugin);

export const ROLES = LEADERSHIP_ROLES;
export default mongoose.model("Club", clubSchema);
