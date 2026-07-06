import AuditLog from "../models/AuditLog.model.js";

export const getAuditLogs = async (req, res) => {
  try {
    const { user, module, action, startDate, endDate, page = 1, limit = 20 } = req.query;

    const query = {};

    if (user) {
      // Find logs by user's objectId. Since the client might pass the name, we could join, 
      // but usually the client sends the user ID if filtering by user, or we can filter by user name by populating first.
      // Let's assume user is the ObjectId for now.
      query.user = user;
    }

    if (module) {
      query.module = module;
    }

    if (action) {
      query.action = action;
    }

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        query.timestamp.$lte = new Date(endDate);
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const logs = await AuditLog.find(query)
      .populate("user", "name email role")
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalLogs = await AuditLog.countDocuments(query);

    res.status(200).json({
      logs,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalLogs / parseInt(limit)),
      totalLogs,
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({ message: "Error fetching audit logs." });
  }
};

export const exportAuditLogs = async (req, res) => {
  try {
    const { user, module, action, startDate, endDate, fields } = req.query;

    const query = {};

    if (user) query.user = user;
    if (module) query.module = module;
    if (action) query.action = action;
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const logs = await AuditLog.find(query)
      .populate("user", "name email role")
      .sort({ timestamp: -1 })
      .lean();

    const formattedLogs = logs.map(log => ({
      Timestamp: log.timestamp ? log.timestamp.toISOString() : "",
      "User Name": log.user?.name || "Unknown",
      "User Email": log.user?.email || "Unknown",
      "User Role": log.user?.role || "Unknown",
      Action: log.action,
      Module: log.module,
      Target: log.target,
      Details: JSON.stringify(log.details)
    }));

    if (formattedLogs.length === 0) {
      return res.status(404).json({ message: "No audit logs found for the given criteria." });
    }

    // Since json2csv is not in package.json, we can either install it, or generate CSV manually.
    // Let's generate it manually to avoid adding unapproved dependencies unless necessary.
    // The user didn't explicitly approve new dependencies.
    const allHeaders = ["Timestamp", "User Name", "User Email", "User Role", "Action", "Module", "Target", "Details"];
    const headers = fields ? fields.split(",") : allHeaders;
    
    // Filter to ensure only valid headers are used
    const validHeaders = headers.filter(h => allHeaders.includes(h.trim())).map(h => h.trim());
    if (validHeaders.length === 0) {
      return res.status(400).json({ message: "No valid fields selected for export." });
    }

    const escapeCsvCell = (value) => {
      if (value === null || value === undefined) return '""';
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    let csvContent = validHeaders.map(escapeCsvCell).join(',') + '\\n';
    
    for (const log of formattedLogs) {
      const row = validHeaders.map(header => escapeCsvCell(log[header]));
      csvContent += row.join(',') + '\\n';
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=audit-logs.csv");
    res.status(200).send(csvContent);

  } catch (error) {
    console.error("Error exporting audit logs:", error);
    res.status(500).json({ message: "Error exporting audit logs." });
  }
};

import SystemLog from "../models/SystemLog.model.js";

export const getSystemLogs = async (req, res) => {
  try {
    const { level, correlationId, service, page = 1, limit = 50 } = req.query;

    const query = {};
    if (level) query.level = level;
    if (correlationId) query.correlationId = correlationId;
    if (service) query.service = service;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const logs = await SystemLog.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalLogs = await SystemLog.countDocuments(query);

    res.status(200).json({
      success: true,
      logs,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalLogs / parseInt(limit)),
      totalLogs,
    });
  } catch (error) {
    console.error("Error fetching system logs:", error);
    res.status(500).json({ success: false, message: "Error fetching system logs." });
  }
};
