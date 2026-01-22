const express = require('express');
const router = express.Router();
const {
    getAllAdmins,
    createAdmin,
    updateAdmin,
    deleteAdmin
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.get('/', protect, getAllAdmins);
router.post('/', protect, createAdmin);
router.put('/:id', protect, updateAdmin);
router.delete('/:id', protect, deleteAdmin);

// Migration route removed - Managers restored to BranchManager collection
// router.post('/migrate', protect, migrateManagersToAdmin);

module.exports = router;
