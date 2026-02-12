const express = require('express');
const router = express.Router();
const { startSession, pingSession, endSession, logActivity, fixSessionData } = require('../controllers/sessionController');
const { protect } = require('../middleware/authMiddleware');

// All session routes require authentication
router.use(protect);

// @route   POST /api/session/start
// @desc    Start or resume user session
// @access  Private
router.post('/start', startSession);

// @route   POST /api/session/ping
// @desc    Heartbeat ping to keep session alive
// @access  Private
router.post('/ping', pingSession);

// @route   POST /api/session/end
// @desc    End user session
// @access  Private
router.post('/end', endSession);

// @route   POST /api/session/log
// @desc    Log generic activity
// @access  Private
router.post('/log', logActivity);

router.post('/fix-data', protect, fixSessionData); // New fix endpoint

module.exports = router;
