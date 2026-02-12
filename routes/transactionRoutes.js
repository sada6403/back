const express = require('express');
const router = express.Router();
const {
    createTransaction,
    getTransactions,
    downloadBill,
    updateTransactionStatus,
    updateTransaction,
    deleteTransaction
} = require('../controllers/transactionController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, authorize('manager', 'field_visitor'), createTransaction)
    .get(protect, getTransactions);

// Update status (Admin/Manager)
router.patch('/:id', protect, authorize('manager', 'admin'), updateTransactionStatus);

// Full update and Delete (Admin/Manager)
router.route('/:id')
    .put(protect, authorize('manager', 'admin'), updateTransaction)
    .delete(protect, authorize('manager', 'admin'), deleteTransaction);

// Download bill and create notification
router.get('/:id/download-bill', protect, authorize('manager', 'field_visitor'), downloadBill);

module.exports = router;
