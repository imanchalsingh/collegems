import StudyGroup from "../models/StudyGroup.model.js";
import ChatMessage from "../models/ChatMessage.model.js";
import Workspace from "../models/Workspace.model.js";
import DocumentVersion from "../models/DocumentVersion.model.js";

export const createStudyGroup = async (req, res) => {
  try {
    const { name, description, course } = req.body;
    const studyGroup = new StudyGroup({
      name,
      description,
      course,
      createdBy: req.user.userId,
      members: [req.user.userId], // Creator is automatically a member
    });
    await studyGroup.save();
    res.status(201).json(studyGroup);
  } catch (error) {
    res.status(500).json({ message: "Error creating study group", error: error.message });
  }
};

export const getStudyGroups = async (req, res) => {
  try {
    // Only fetch active study groups
    const studyGroups = await StudyGroup.find({ isActive: true })
      .populate("createdBy", "name email")
      .populate("course", "name")
      .sort("-createdAt");
    res.status(200).json(studyGroups);
  } catch (error) {
    res.status(500).json({ message: "Error fetching study groups", error: error.message });
  }
};

export const joinStudyGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const studyGroup = await StudyGroup.findById(id);
    if (!studyGroup) {
      return res.status(404).json({ message: "Study group not found" });
    }
    
    if (!studyGroup.members.includes(req.user.userId)) {
      studyGroup.members.push(req.user.userId);
      await studyGroup.save();
    }
    
    res.status(200).json(studyGroup);
  } catch (error) {
    res.status(500).json({ message: "Error joining study group", error: error.message });
  }
};

export const getChatHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const messages = await ChatMessage.find({ groupId: id })
      .populate("senderId", "name email")
      .sort("createdAt");
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: "Error fetching chat history", error: error.message });
  }
};

export const saveDocumentVersion = async (req, res) => {
  try {
    const { id } = req.params;
    const { versionName } = req.body;
    
    const workspace = await Workspace.findOne({ groupId: id });
    if (!workspace) {
      return res.status(404).json({ message: "No document state found for this group" });
    }
    
    const version = new DocumentVersion({
      groupId: id,
      versionName: versionName || `Version ${new Date().toLocaleString()}`,
      documentState: workspace.documentState,
      savedBy: req.user.userId || req.user._id,
    });
    
    await version.save();
    
    const populated = await version.populate("savedBy", "name email");
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: "Error saving document version", error: error.message });
  }
};

export const getDocumentVersions = async (req, res) => {
  try {
    const { id } = req.params;
    const versions = await DocumentVersion.find({ groupId: id })
      .select("-documentState")
      .populate("savedBy", "name email")
      .sort("-createdAt");
      
    res.status(200).json(versions);
  } catch (error) {
    res.status(500).json({ message: "Error fetching versions", error: error.message });
  }
};

export const restoreDocumentVersion = async (req, res) => {
  try {
    const { id, versionId } = req.params;
    
    const version = await DocumentVersion.findById(versionId);
    if (!version) return res.status(404).json({ message: "Version not found" });
    
    await Workspace.findOneAndUpdate(
      { groupId: id },
      { documentState: version.documentState },
      { upsert: true }
    );
    
    res.status(200).json({ message: "Version restored successfully. Please refresh the editor." });
  } catch (error) {
    res.status(500).json({ message: "Error restoring version", error: error.message });
  }
};
