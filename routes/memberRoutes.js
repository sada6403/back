const express = require('express');
const router = express.Router();
const { registerMember, getMembers, updateMember, deleteMember, importMembers } = require('../controllers/memberController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { enforceRBAC } = require('../middleware/rbacMiddleware');

router.use(protect);
router.use(enforceRBAC);

router.route('/')
    .post(authorize('field_visitor', 'it_sector', 'manager'), registerMember)
    .get(getMembers);

router.route('/:id')
    .put(authorize('manager', 'it_sector'), updateMember)
    .delete(authorize('manager', 'it_sector'), deleteMember);

router.post('/import', importMembers);

module.exports = router;
