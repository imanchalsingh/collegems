import express from 'express';
import { checkDependencies } from '../controllers/dependency.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';

const router = express.Router();

// Only admins or specific roles should run dependency checks before deletion
router.get('/:entityType/:id', protect, authorize('admin', 'hod', 'teacher'), checkDependencies);

export default router;
