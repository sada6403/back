const express = require('express');
const router = express.Router();
const { registerFieldVisitor, getFieldVisitors, sendVerificationEmail, updateFieldVisitor, deleteFieldVisitor } = require('../controllers/fieldVisitorController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { enforceRBAC } = require('../middleware/rbacMiddleware');

router.use(protect);
router.use(enforceRBAC);

router.route('/')
    .post(authorize('manager'), registerFieldVisitor)
    .get(getFieldVisitors);

router.route('/:id')
    .put(authorize('manager'), updateFieldVisitor)
    .delete(authorize('manager'), deleteFieldVisitor);

// Email verification specific route
router.post('/send-otp', sendVerificationEmail);

module.exports = router;
