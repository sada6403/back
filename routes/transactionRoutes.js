const express = require('express');
const router = express.Router();
const {
    createTransaction,
    getTransactions,
    downloadBill,
    updateTransactionStatus,
    updateTransaction,
    deleteTransaction,
    getTransactionStats
} = require('../controllers/transactionController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/stats', getTransactionStats);

router.route('/')
    .post(protect, authorize('manager', 'field_visitor'), createTransaction)
    .get(protect, getTransactions);

// Update status (Admin/Manager/Analyzer)
router.patch('/:id', protect, authorize('manager', 'admin', 'analyzer'), updateTransactionStatus);

// Full update and Delete (Admin/Manager/Analyzer)
router.route('/:id')
    .put(protect, authorize('manager', 'admin', 'analyzer'), updateTransaction)
    .delete(protect, authorize('manager', 'admin', 'analyzer'), deleteTransaction);

// Download bill and create notification
router.get('/:id/download-bill', protect, authorize('manager', 'field_visitor'), downloadBill);

module.exports = router;
