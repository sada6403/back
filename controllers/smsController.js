const { sendSMS } = require('../utils/smsService');
const ITSector = require('../models/ITSector');
const BranchManager = require('../models/BranchManager');
const FieldVisitor = require('../models/FieldVisitor');

// Simple in-memory OTP store for now (Production should use Redis or DB)
const otpStore = new Map();

// @desc    Send OTP to a mobile number
// @route   POST /api/sms/otp/send
// @access  Public (or Protected depending on flow)
const sendOTP = async (req, res) => {
    try {
        const { mobile } = req.body;
        if (!mobile) {
            return res.status(400).json({ success: false, message: 'Mobile number is required' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const message = `Your OTP is: ${otp}. Do not share this with anyone.`;

        // Send SMS
        await sendSMS(mobile, message);

        // Store OTP with 5-minute expiry
        otpStore.set(mobile, { code: otp, expires: Date.now() + 5 * 60 * 1000 });

        res.json({ success: true, message: 'OTP sent successfully' });
    } catch (error) {
        console.error('Send OTP Error:', error.message);
        res.status(500).json({ success: false, message: 'Failed to send OTP', error: error.message });
    }
};

// @desc    Verify OTP
// @route   POST /api/sms/otp/verify
// @access  Public
const verifyOTP = async (req, res) => {
    try {
        const { mobile, otp } = req.body;

        if (!msgData || !msgData.code) { // Check if OTP exists
            const storedData = otpStore.get(mobile);
            if (!storedData) {
                return res.status(400).json({ success: false, message: 'OTP not found or expired' });
            }

            if (storedData.expires < Date.now()) {
                otpStore.delete(mobile);
                return res.status(400).json({ success: false, message: 'OTP expired' });
            }

            if (storedData.code === otp) {
                otpStore.delete(mobile); // Clear after usage
                return res.json({ success: true, message: 'OTP Verified' });
            } else {
                return res.status(400).json({ success: false, message: 'Invalid OTP' });
            }
        }

    } catch (error) {
        res.status(500).json({ success: false, message: 'Verification failed', error: error.message });
    }
};

// @desc    Send Bulk SMS (Wishes/Notifications)
// @route   POST /api/sms/bulk
// @access  Private (IT Sector/Admin)
const Member = require('../models/Member');

// ... (OTP functions remain same)

// @desc    Send Bulk SMS (Wishes/Notifications)
// @route   POST /api/sms/bulk
// @access  Private (IT Sector/Admin)
const sendBulkSMS = async (req, res) => {
    try {
        const { message, recipients, criteria } = req.body;
        // recipients: ['077...', '071...']
        // criteria: { roles: ['manager', 'field_visitor', 'member'] }

        let targetNumbers = [];

        if (recipients && Array.isArray(recipients) && recipients.length > 0) {
            targetNumbers = recipients;
        } else if (criteria && criteria.roles && Array.isArray(criteria.roles)) {
            // Fetch users based on selected roles
            const roles = criteria.roles;
            const promises = [];

            if (roles.includes('manager')) {
                promises.push(BranchManager.find({}).select('phone'));
            }
            if (roles.includes('field_visitor')) {
                promises.push(FieldVisitor.find({}).select('phone'));
            }
            if (roles.includes('member')) {
                promises.push(Member.find({}).select('contact')); // Member uses 'contact' for phone
            }

            const results = await Promise.all(promises);

            // Flatten results and extract numbers
            results.flat().forEach(doc => {
                const num = doc.phone || doc.contact;
                if (num) targetNumbers.push(num);
            });
        }

        // Remove duplicates
        targetNumbers = [...new Set(targetNumbers)];

        if (targetNumbers.length === 0) {
            return res.status(400).json({ success: false, message: 'No recipients found' });
        }

        console.log(`Sending Bulk SMS to ${targetNumbers.length} recipients...`);

        // Send in loop (Note: Real bulk APIs support batching, but we'll loop standard send for now)
        let successCount = 0;
        let failCount = 0;

        for (const mobile of targetNumbers) {
            try {
                await sendSMS(mobile, message);
                successCount++;
            } catch (err) {
                console.error(`Failed to send to ${mobile}:`, err.message);
                failCount++;
            }
        }

        res.json({
            success: true,
            message: `Bulk sending process completed`,
            stats: { total: targetNumbers.length, sent: successCount, failed: failCount }
        });

    } catch (error) {
        console.error('Bulk SMS Error:', error.message);
        res.status(500).json({ success: false, message: 'Bulk SMS failed', error: error.message });
    }
};

module.exports = { sendOTP, verifyOTP, sendBulkSMS };
