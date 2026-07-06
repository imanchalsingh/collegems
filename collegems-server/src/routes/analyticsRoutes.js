import express from 'express';
import {
    trackPageVisit,
    getPageVisitMetrics,
    getVisitsByRole
} from '../controllers/analyticsController.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';


const router = express.Router();

// Track a page visit
router.post('/track-visit', protect, trackPageVisit);

// Get page visit metrics (admin only)
router.get('/page-visits', protect, restrictTo('admin'), getPageVisitMetrics);

// Get visits by role (admin only)
router.get('/visits-by-role', protect, restrictTo('admin'), getVisitsByRole);

export default router;