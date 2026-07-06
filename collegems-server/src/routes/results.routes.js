import express from 'express';
import { createResult, getResults, publishResult, publishPreview, publishAll } from '../controllers/results.controller.js';
import { protect } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
const router = express.Router();

router.get("/my", protect, getResults);
router.post('/create', protect, allowRoles("teacher", "hod"), createResult);
router.get('/publish-preview', protect, allowRoles("hod"), publishPreview);
router.put('/:id/publish', protect, allowRoles("hod"), publishResult);
router.put('/publish-all', protect, allowRoles("hod"), publishAll);
export default router;
