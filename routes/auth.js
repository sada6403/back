const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Manager = require('../models/Manager');
const FieldVisitor = require('../models/FieldVisitor');
const BranchManager = require('../models/BranchManager');
const Employee = require('../models/Employee');
const { sendSMS } = require('../utils/smsService');

// LOGIN
router.post('/login', async (req, res) => {
    const { username, password, role } = req.body;

    try {
        let User = Employee; // Default
        const r = role ? role.toLowerCase() : '';

        if (r === 'manager') User = Manager;
        else if (r === 'field_visitor' || r === 'field visitor') User = FieldVisitor;
        else if (r.includes('branch')) User = BranchManager;

        // Find user by userId (username) or email
        const user = await User.findOne({
            $or: [{ userId: username }, { email: username }]
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Invalid credentials' });
        }

        // Return user info (Token implementation skipped for simplicity as per existing logic, or added if JWT was used)
        // Returning data structure expected by frontend AuthService
        res.json({
            success: true,
            data: {
                code: user.userId,
                id: user._id,
                token: "dummy-token-for-now", // Replace with JWT if needed
                name: user.fullName,
                role: user.role,
                branchId: user.branchId,
                branchName: user.branchName,
                email: user.email,
                phone: user.phone
            }
        });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// SEND OTP
router.post('/send-otp', async (req, res) => {
    const { phone } = req.body;
    // Generate Random 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // In a real app, save OTP to DB with expiration
    // For now, we just send it via SMS

    try {
        await sendSMS(phone, `Your OTP is: ${otp}`);
        res.json({ success: true, message: 'OTP sent successfully', otp: otp }); // Dev: returning OTP for debug
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to send SMS', error: err.message });
    }
});

module.exports = router;
