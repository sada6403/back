const express = require('express');
const router = express.Router();
const { createTransaction, getTransactions, downloadBill, updateTransactionStatus } = require('../controllers/transactionController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, authorize('manager', 'field_visitor'), createTransaction)
    .get(getTransactions);

// Update status (Admin/Manager)
router.patch('/:id', protect, authorize('manager', 'admin'), updateTransactionStatus);

// Download bill and create notification
router.get('/:id/download-bill', protect, authorize('manager', 'field_visitor'), downloadBill);

module.exports = router;
