const express = require('express');
const router = express.Router();
const { getOnlineUsers, getActivityLogs, getStats } = require('../controllers/monitorController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleAuth');

// All monitoring routes require authentication AND IT/Admin role
router.use(protect);
router.use(requireRole('it_sector', 'admin'));

// @route   GET /api/monitor/online-users
// @desc    Get list of currently online users
// @access  Private (IT/Admin only)
// @query   ?role=Field Visitor&branch=Kondavil&search=john
router.get('/online-users', getOnlineUsers);

// @route   GET /api/monitor/activity-logs
// @desc    Get activity logs with pagination and filters
// @access  Private (IT/Admin only)
// @query   ?userId=123&eventType=login&page=1&limit=50
router.get('/activity-logs', getActivityLogs);

// @route   GET /api/monitor/stats
// @desc    Get monitoring dashboard statistics
// @access  Private (IT/Admin only)
router.get('/stats', getStats);

module.exports = router;
