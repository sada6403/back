const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/companyTransferController');
const { protect } = require('../middleware/authMiddleware');

// Submit a new transfer (Manager / Field Visitor)
router.post('/', protect, ctrl.upload.single('image'), ctrl.submitTransfer);

// Get all pending transfers (IT Sector / Admin)
router.get('/pending', protect, ctrl.getPendingTransfers);

// Get all transfers
router.get('/', protect, ctrl.getAllTransfers);

// Approve a transfer
router.patch('/:id/approve', protect, ctrl.approveTransfer);

// Decline a transfer
router.patch('/:id/decline', protect, ctrl.declineTransfer);

module.exports = router;
