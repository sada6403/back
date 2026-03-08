const express = require('express');
const router = express.Router();
const { registerMember, getMembers, getMember, updateMember, deleteMember, importMembers, getMemberStats } = require('../controllers/memberController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { enforceRBAC } = require('../middleware/rbacMiddleware');

router.use(protect);
router.use(enforceRBAC);

router.route('/')
    .post(authorize('field_visitor', 'it_sector', 'manager', 'analyzer'), registerMember)
    .get(getMembers);

router.get('/stats', getMemberStats);

router.route('/:id')
    .get(getMember)
    .put(authorize('manager', 'it_sector', 'analyzer'), updateMember)
    .delete(authorize('manager', 'it_sector', 'analyzer'), deleteMember);

router.post('/import', importMembers);

module.exports = router;
