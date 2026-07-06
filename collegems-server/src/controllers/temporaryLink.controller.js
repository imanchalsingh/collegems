import * as tempLinkService from "../services/temporaryLink.service.js";

// @desc    Generate a temporary access link
// @route   POST /api/temporary-links
// @access  Private
export const generateLink = async (req, res) => {
  try {
    const { resourceType, resourceId, expiresInMinutes } = req.body;
    
    if (!resourceType || !resourceId) {
      return res.status(400).json({ message: "resourceType and resourceId are required" });
    }

    const link = await tempLinkService.generateLink(
      resourceType, 
      resourceId, 
      req.user.id, 
      expiresInMinutes || 60
    );

    // Build the full URL that frontend will use
    const baseUrl = process.env.VITE_BACKEND_URL ? process.env.VITE_BACKEND_URL.replace('/api', '') : 'http://localhost:5173';
    const accessUrl = `${baseUrl}/shared/${link.token}`;

    res.status(201).json({
      message: "Temporary link generated successfully",
      link: {
        token: link.token,
        expiresAt: link.expiresAt,
        accessUrl,
        resourceType,
      }
    });
  } catch (error) {
    if (error.message.includes("Unsupported resource type") || error.message.includes("not found")) {
      return res.status(400).json({ message: error.message });
    }
    console.error("Error generating temporary link:", error);
    res.status(500).json({ message: "Server error generating link" });
  }
};

// @desc    Access a resource via a temporary link
// @route   GET /api/temporary-links/:token
// @access  Public (Access controlled by token)
export const accessLink = async (req, res) => {
  try {
    const { token } = req.params;
    const data = await tempLinkService.validateAndAccessLink(token);
    
    res.json({
      message: "Access granted",
      data
    });
  } catch (error) {
    if (["Invalid access token", "This link has been revoked", "This link has expired"].includes(error.message)) {
      return res.status(403).json({ message: error.message });
    }
    console.error("Error accessing temporary link:", error);
    res.status(500).json({ message: "Server error accessing link" });
  }
};

// @desc    Revoke a temporary link
// @route   PUT /api/temporary-links/:token/revoke
// @access  Private (Owner or Admin)
export const revokeLink = async (req, res) => {
  try {
    const { token } = req.params;
    const isAdmin = req.user.role === "admin" || req.user.role === "hod";
    
    await tempLinkService.revokeLink(token, req.user.id, isAdmin);
    
    res.json({ message: "Link revoked successfully" });
  } catch (error) {
    if (error.message === "Link not found") {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === "Unauthorized to revoke this link") {
      return res.status(401).json({ message: error.message });
    }
    console.error("Error revoking temporary link:", error);
    res.status(500).json({ message: "Server error revoking link" });
  }
};

// @desc    Get active links created by the user
// @route   GET /api/temporary-links/my-links
// @access  Private
export const getMyLinks = async (req, res) => {
  try {
    const links = await tempLinkService.listActiveLinks(req.user.id);
    res.json({ links });
  } catch (error) {
    console.error("Error listing temporary links:", error);
    res.status(500).json({ message: "Server error listing links" });
  }
};
