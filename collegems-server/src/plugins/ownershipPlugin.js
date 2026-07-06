import mongoose from "mongoose";

/**
 * A Mongoose plugin that adds generic ownership assignment capabilities.
 * It adds `ownerId` and an `ownershipHistory` audit trail.
 */
export default function ownershipPlugin(schema, options = {}) {
  // Add ownership fields to the schema
  schema.add({
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      default: null,
    },
    ownershipHistory: {
      type: [
        {
          previousOwnerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
          },
          newOwnerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
          },
          transferredBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
          },
          transferredAt: {
            type: Date,
            default: Date.now,
          },
          reason: {
            type: String,
            default: "",
          },
        },
      ],
      default: [],
    },
  });

  // Pre-save hook to initialize ownership if createdBy is provided but ownerId is not
  schema.pre("save", function () {
    // If it's a new document and has no ownerId but has createdBy, we default ownerId to createdBy
    if (this.isNew && !this.ownerId && this.createdBy) {
      this.ownerId = this.createdBy;
    }
  });
}
