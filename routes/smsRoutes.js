const express = require('express');
const router = express.Router();
const { sendOTP, verifyOTP, sendBulkSMS } = require('../controllers/smsController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/otp/send', sendOTP);
router.post('/otp/verify', verifyOTP);

// Bulk SMS restricted to IT Sector and Admin
router.post('/bulk', protect, authorize('it_sector', 'admin'), sendBulkSMS);

module.exports = router;
