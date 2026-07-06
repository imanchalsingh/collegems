const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/settingsController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// All settings routes require admin authentication
router.use(protect);
router.use(authorize('admin'));

router.get('/', getSettings);
router.put('/', updateSettings);

module.exports = router;