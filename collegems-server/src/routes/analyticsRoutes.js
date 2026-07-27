import express from 'express';
import {
    trackPageVisit,
    getPageVisitMetrics,
    getVisitsByRole
} from '../controllers/analyticsController.js';
import { protect } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';

const router = express.Router();

// Track a page visit
router.post('/track-visit', protect, trackPageVisit);

// Get page visit metrics (admin/hod only)
// Get page visit metrics (admin/hod only)
router.get('/page-visits', protect, authorize("admin", "hod"), getPageVisitMetrics);

// Get visits by role (admin/hod only)
router.get('/visits-by-role', protect, authorize("admin", "hod"), getVisitsByRole);

export default router;