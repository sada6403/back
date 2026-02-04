const express = require('express');
const router = express.Router();
const { registerMember, getMembers, updateMember, deleteMember, importMembers } = require('../controllers/memberController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, authorize('field_visitor', 'it_sector', 'manager'), registerMember)
    .get(getMembers);

router.route('/:id')
    .put(protect, authorize('manager', 'it_sector'), updateMember)
    .delete(protect, authorize('manager', 'it_sector'), deleteMember);

router.post('/import', protect, importMembers);

module.exports = router;
