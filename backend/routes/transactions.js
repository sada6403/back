const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');

// @desc    Get all transactions
// @route   GET /api/transactions
// @access  Private (usually)
router.get('/', async (req, res) => {
    try {
        const { memberId } = req.query;
        let query = {};

        if (memberId) {
            query.memberId = memberId;
        }

        // Sort by date desc
        const transactions = await Transaction.find(query).sort({ date: -1 });
        res.json(transactions);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @desc    Add a transaction
// @route   POST /api/transactions
router.post('/', async (req, res) => {
    try {
        const { memberId, amount, type, description, product, status, date } = req.body;

        const transaction = new Transaction({
            memberId,
            amount,
            type,
            description,
            product,
            productName: product, // redundancy for safety
            status: status || 'approved',
            date: date || Date.now()
        });

        const saved = await transaction.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
