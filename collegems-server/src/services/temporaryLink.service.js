import crypto from "crypto";
import mongoose from "mongoose";
import TemporaryLink from "../models/TemporaryLink.model.js";

// Configured valid resource types for security
export const SUPPORTED_RESOURCE_TYPES = ["Resource", "Book", "ExamSchedule", "Assignment"];

/**
 * Generate a new temporary link
 * @param {string} resourceType 
 * @param {string} resourceId 
 * @param {string} createdBy 
 * @param {number} expiresInMinutes 
 * @returns {Object} The created link
 */
export const generateLink = async (resourceType, resourceId, createdBy, expiresInMinutes = 60) => {
  if (!SUPPORTED_RESOURCE_TYPES.includes(resourceType)) {
    throw new Error(`Unsupported resource type: ${resourceType}`);
  }

  // Validate that the resource actually exists
  const Model = mongoose.model(resourceType);
  if (!Model) {
    throw new Error(`Model ${resourceType} not found in mongoose schema`);
  }

  const resource = await Model.findById(resourceId);
  if (!resource) {
    throw new Error(`${resourceType} with ID ${resourceId} not found`);
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  const newLink = await TemporaryLink.create({
    token,
    resourceType,
    resourceId,
    createdBy,
    expiresAt,
  });

  return newLink;
};

/**
 * Validate and retrieve resource from a token
 * @param {string} token 
 * @returns {Object} resource and type
 */
export const validateAndAccessLink = async (token) => {
  const link = await TemporaryLink.findOne({ token }).populate("resourceId");

  if (!link) {
    throw new Error("Invalid access token");
  }

  if (link.isRevoked) {
    throw new Error("This link has been revoked");
  }

  if (new Date() > link.expiresAt) {
    throw new Error("This link has expired");
  }

  return {
    resource: link.resourceId,
    resourceType: link.resourceType,
    expiresAt: link.expiresAt
  };
};

/**
 * Revoke a temporary link
 * @param {string} token 
 * @param {string} userId (to ensure only creator or admin can revoke)
 */
export const revokeLink = async (token, userId, isAdmin = false) => {
  const link = await TemporaryLink.findOne({ token });

  if (!link) {
    throw new Error("Link not found");
  }

  if (!isAdmin && link.createdBy.toString() !== userId.toString()) {
    throw new Error("Unauthorized to revoke this link");
  }

  link.isRevoked = true;
  await link.save();

  return link;
};

/**
 * List active links created by a user
 */
export const listActiveLinks = async (userId) => {
  return TemporaryLink.find({
    createdBy: userId,
    isRevoked: false,
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 });
};
