const express = require('express');
const router = express.Router();
const Member = require('../models/Member');

// GET all members
router.get('/', async (req, res) => {
    try {
        const members = await Member.find().sort({ joinedDate: -1 });
        res.json(members);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST create member
router.post('/', async (req, res) => {
    const { name, contact, email, dob, joinedDate, totalBought, totalSold, transactions } = req.body;

    const member = new Member({
        name,
        contact,
        email,
        dob,
        joinedDate,
        totalBought,
        totalSold,
        transactions
    });

    try {
        const newMember = await member.save();
        res.status(201).json(newMember);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PUT update member
router.put('/:id', async (req, res) => {
    try {
        const updatedMember = await Member.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedMember);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE member
router.delete('/:id', async (req, res) => {
    try {
        await Member.findByIdAndDelete(req.params.id);
        res.json({ message: 'Member deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
