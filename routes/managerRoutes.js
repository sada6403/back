const express = require('express');
const router = express.Router();
const { getManagers, updateManager, deleteManager } = require('../controllers/managerController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, authorize('manager', 'it_sector'), getManagers);

router.route('/:id')
    .put(protect, authorize('manager', 'it_sector'), updateManager)
    .delete(protect, authorize('manager', 'it_sector'), deleteManager);

module.exports = router;
