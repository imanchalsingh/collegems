import express from "express";
import { getAuditLogs, exportAuditLogs, getSystemLogs } from "../controllers/auditLog.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";

const router = express.Router();

// Only HOD (Admin) should be able to view or export audit logs
router.use(protect);
router.use(allowRoles("hod"));

router.get("/", getAuditLogs);
router.get("/export", exportAuditLogs);
router.get("/system-logs", getSystemLogs);

export default router;
