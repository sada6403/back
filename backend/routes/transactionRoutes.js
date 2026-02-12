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

// Update status (Admin/Manager/IT)
router.patch('/:id', protect, authorize('manager', 'admin', 'it_sector'), updateTransactionStatus);

// Full update and Delete (Admin/Manager/IT)
router.route('/:id')
    .put(protect, authorize('manager', 'admin', 'it_sector'), updateTransaction)
    .delete(protect, authorize('manager', 'admin', 'it_sector'), deleteTransaction);

// Download bill and create notification
router.get('/:id/download-bill', protect, authorize('manager', 'field_visitor'), downloadBill);

module.exports = router;
