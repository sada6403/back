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

// Update status (Admin/Manager/IT/Analyzer)
router.patch('/:id', protect, authorize('manager', 'admin', 'it_sector', 'analyzer'), updateTransactionStatus);

// Full update and Delete (Admin/Manager/IT/Analyzer)
router.route('/:id')
    .put(protect, authorize('manager', 'admin', 'it_sector', 'analyzer'), updateTransaction)
    .delete(protect, authorize('manager', 'admin', 'it_sector', 'analyzer'), deleteTransaction);

// Download bill and create notification (Include analyzer)
router.get('/:id/download-bill', protect, authorize('manager', 'field_visitor', 'analyzer'), downloadBill);

module.exports = router;
