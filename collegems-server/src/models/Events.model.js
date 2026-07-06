import mongoose from "mongoose";
import ownershipPlugin from "../plugins/ownershipPlugin.js";

const EventsSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        readBy: [
  {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
],

        shortDescription: {
            type: String,
            required: true,
            trim: true,
        },
        club: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Club",
         },

        description: {
            type: String,
            required: true,
        },

        category: {
            type: String,
            enum: ["Workshop", "Seminar", "Webinar", "Alumni Talk", "Hackathon", "Training", "Conference", "Guest Lecture"],
            required: true,
        },

        mode: {
            type: String,
            enum: ["online", "offline", "hybrid"],
            required: true,
        },

        organization: {
            type: String,
            required: true,
            trim: true,
        },

        speaker: {
            type: String,
            required: true,
            trim: true,
        },

        date: {
            type: Date,
            required: true,
        },

        startTime: {
            type: String,
            required: true,
        },

        endTime: {
            type: String,
            required: true,
        },

        // required only if offline
        venue: {
            type: String,
            required: function () {
                return this.mode === "offline" || this.mode === "hybrid";
            },
        },

        // required only if online
        meetingLink: {
            type: String,
            required: function () {
                return this.mode === "online" || this.mode === "hybrid";
            },
        },

        coverImage: {
            type: String,
            required: true,
        },

        registrationRequired: {
            type: Boolean,
            default: false,
        },

        maxParticipants: {
            type: Number,
            default: null,
        },

        registrationDeadline: {
            type: Date,
        },

        contactName: {
            type: String,
            required: true,
        },

        contactEmail: {
            type: String,
            required: true,
            lowercase: true,
        },

        status: {
            type: String,
            enum: ["upcoming", "ongoing", "completed"],
            default: "upcoming",
        },

        contactPhone: {
            type: String,
            trim: true,
        },

        prerequisites: {
            type: String,
            trim: true,
        },

        targetAudience: {
            type: String,
            trim: true,
        },

        tags: {
            type: String,
            trim: true,
        },
        qrCode: {
            type: String,
            unique: true,
            sparse: true,
        },
        qrCodeActive: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

EventsSchema.plugin(ownershipPlugin);

const Event = mongoose.model("Event", EventsSchema);

export default Event;