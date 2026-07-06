import Resource from "../models/Resource.model.js";
import { logAction } from "../utils/auditService.js";

// @desc    Get all resources
// @route   GET /api/resources
// @access  Private
export const getAllResources = async (req, res) => {
  try {
    const resources = await Resource.find();
    res.status(200).json(resources);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Create a resource
// @route   POST /api/resources
// @access  Private/HOD
export const createResource = async (req, res) => {
  try {
    const { name, type, capacity, location, features, status } = req.body;

    if (!name || !type) {
      return res.status(400).json({ message: "Please provide resource name and type" });
    }

    const resource = await Resource.create({
      name,
      type,
      capacity,
      location,
      features,
      status,
    });

    await logAction(req.user.id, "CREATE_RESOURCE", "Resource", resource._id, { name, type });

    res.status(201).json(resource);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Update a resource
// @route   PUT /api/resources/:id
// @access  Private/HOD
export const updateResource = async (req, res) => {
  try {
    const resource = await Resource.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!resource) {
      return res.status(404).json({ message: "Resource not found" });
    }

    await logAction(req.user.id, "UPDATE_RESOURCE", "Resource", resource._id, req.body);

    res.status(200).json(resource);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Delete a resource
// @route   DELETE /api/resources/:id
// @access  Private/HOD
export const deleteResource = async (req, res) => {
  try {
    const resource = await Resource.findByIdAndDelete(req.params.id);

    if (!resource) {
      return res.status(404).json({ message: "Resource not found" });
    }

    await logAction(req.user.id, "DELETE_RESOURCE", "Resource", resource._id, { name: resource.name });

    res.status(200).json({ message: "Resource deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
