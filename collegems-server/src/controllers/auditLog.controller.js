import AuditLog from "../models/AuditLog.model.js";
import SystemLog from "../models/SystemLog.model.js";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;
const MAX_EXPORT_LIMIT = 10000;

const validatePage = (page) => {
  const parsed = parseInt(page, 10);
  return isNaN(parsed) || parsed < 1 ? 1 : parsed;
};

const validateLimit = (limit, maxLimit = MAX_LIMIT) => {
  const parsed = parseInt(limit, 10);
  if (isNaN(parsed) || parsed < 1) return DEFAULT_LIMIT;
  return Math.min(parsed, maxLimit);
};

const validateDate = (dateStr) => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
};

const sanitizeField = (field) => {
  if (!field || typeof field !== 'string') return null;
  return field.trim();
};

const escapeCsvCell = (value) => {
  if (value === null || value === undefined) return '""';
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

export const getAuditLogs = async (req, res) => {
  try {
    const { user, module, action, startDate, endDate } = req.query;
    const page = validatePage(req.query.page);
    const limit = validateLimit(req.query.limit);

    const query = {};

    if (user && typeof user === 'string') {
      query.user = user.trim();
    }

    if (module && typeof module === 'string') {
      query.module = module.trim();
    }

    if (action && typeof action === 'string') {
      query.action = action.trim();
    }

    if (startDate || endDate) {
      query.timestamp = {};
      const validStart = validateDate(startDate);
      const validEnd = validateDate(endDate);

      if (startDate && !validStart) {
        return res.status(400).json({
          success: false,
          message: 'Invalid startDate format. Please use ISO format (YYYY-MM-DDTHH:mm:ss)'
        });
      }

      if (endDate && !validEnd) {
        return res.status(400).json({
          success: false,
          message: 'Invalid endDate format. Please use ISO format (YYYY-MM-DDTHH:mm:ss)'
        });
      }

      if (validStart) query.timestamp.$gte = validStart;
      if (validEnd) query.timestamp.$lte = validEnd;

      if (validStart && validEnd && validStart > validEnd) {
        return res.status(400).json({
          success: false,
          message: 'startDate cannot be after endDate'
        });
      }
    }

    const skip = (page - 1) * limit;

    const [logs, totalLogs] = await Promise.all([
      AuditLog.find(query)
        .populate("user", "name email role")
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      logs,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalLogs / limit),
        totalLogs,
        limit
      }
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching audit logs.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const exportAuditLogs = async (req, res) => {
  try {
    const { user, module, action, startDate, endDate, fields } = req.query;

    const query = {};

    if (user && typeof user === 'string') query.user = user.trim();
    if (module && typeof module === 'string') query.module = module.trim();
    if (action && typeof action === 'string') query.action = action.trim();

    if (startDate || endDate) {
      query.timestamp = {};
      const validStart = validateDate(startDate);
      const validEnd = validateDate(endDate);

      if (startDate && !validStart) {
        return res.status(400).json({
          success: false,
          message: 'Invalid startDate format'
        });
      }

      if (endDate && !validEnd) {
        return res.status(400).json({
          success: false,
          message: 'Invalid endDate format'
        });
      }

      if (validStart) query.timestamp.$gte = validStart;
      if (validEnd) query.timestamp.$lte = validEnd;

      if (validStart && validEnd && validStart > validEnd) {
        return res.status(400).json({
          success: false,
          message: 'startDate cannot be after endDate'
        });
      }
    }

    // Limit export to prevent performance issues
    const logs = await AuditLog.find(query)
      .populate("user", "name email role")
      .sort({ timestamp: -1 })
      .limit(MAX_EXPORT_LIMIT)
      .lean();

    if (logs.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No audit logs found for the given criteria."
      });
    }

    const allHeaders = ["Timestamp", "User Name", "User Email", "User Role", "Action", "Module", "Target", "Details"];
    const headers = fields ? fields.split(",").map(f => f.trim()) : allHeaders;
    const validHeaders = headers.filter(h => allHeaders.includes(h));

    if (validHeaders.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields selected for export."
      });
    }

    const formattedLogs = logs.map(log => ({
      Timestamp: log.timestamp ? log.timestamp.toISOString() : "",
      "User Name": log.user?.name || "Unknown",
      "User Email": log.user?.email || "Unknown",
      "User Role": log.user?.role || "Unknown",
      Action: log.action || "",
      Module: log.module || "",
      Target: log.target || "",
      Details: JSON.stringify(log.details || {})
    }));

    let csvContent = validHeaders.map(escapeCsvCell).join(',') + '\n';

    for (const log of formattedLogs) {
      const row = validHeaders.map(header => escapeCsvCell(log[header]));
      csvContent += row.join(',') + '\n';
    }

    const fileName = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
    res.status(200).send(csvContent);

  } catch (error) {
    console.error("Error exporting audit logs:", error);
    res.status(500).json({
      success: false,
      message: "Error exporting audit logs.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getSystemLogs = async (req, res) => {
  try {
    const { level, correlationId, service } = req.query;
    const page = validatePage(req.query.page);
    const limit = validateLimit(req.query.limit, 50);

    const query = {};

    if (level && typeof level === 'string') {
      query.level = level.trim();
    }

    if (correlationId && typeof correlationId === 'string') {
      query.correlationId = correlationId.trim();
    }

    if (service && typeof service === 'string') {
      query.service = service.trim();
    }

    const skip = (page - 1) * limit;

    const [logs, totalLogs] = await Promise.all([
      SystemLog.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit),
      SystemLog.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      logs,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalLogs / limit),
        totalLogs,
        limit
      }
    });
  } catch (error) {
    console.error("Error fetching system logs:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching system logs.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};