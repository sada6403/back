const express = require('express');
const router = express.Router();
const {
	getManagerDashboard,
	getFieldVisitorDashboard,
	getYearlyAnalysis,
	getDashboardStats,
	getMemberTransactions,
	getDailyBranchComparison
} = require('../controllers/reportController');
const { getVisualAnalytics } = require('../controllers/visualAnalyticsController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Manager view: branch summary + FV contributions
router.get('/manager-dashboard', protect, authorize('manager'), getManagerDashboard);

// Field visitor view: own totals + notifications + notes
router.get('/field-visitor-dashboard', protect, authorize('field_visitor'), getFieldVisitorDashboard);

// Dashboard stats: accurate numbers for UI
router.get('/dashboard-stats', protect, getDashboardStats);

// Backward-compatible single dashboard endpoint that routes by role
router.get('/dashboard', protect, (req, res, next) => {
	if (req.user?.role === 'manager') {
		return getManagerDashboard(req, res, next);
	}
	if (req.user?.role === 'field_visitor') {
		return getFieldVisitorDashboard(req, res, next);
	}
	return res.status(403).json({ success: false, message: 'Role not authorized for dashboard' });
});

router.get('/member-transactions', protect, getMemberTransactions);
router.get('/yearly', protect, getYearlyAnalysis);
router.get('/daily-branch-comparison', protect, getDailyBranchComparison);
router.get('/visual-analytics', protect, getVisualAnalytics);

module.exports = router;
