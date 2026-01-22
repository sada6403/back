const express = require('express');
const router = express.Router();
const { registerFieldVisitor, getFieldVisitors, sendVerificationEmail, updateFieldVisitor, deleteFieldVisitor } = require('../controllers/fieldVisitorController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, authorize('manager'), registerFieldVisitor)
    .get(protect, getFieldVisitors);

router.route('/:id')
    .put(protect, authorize('manager'), updateFieldVisitor)
    .delete(protect, authorize('manager'), deleteFieldVisitor);

// Email verification specific route
router.post('/send-otp', sendVerificationEmail);

module.exports = router;
