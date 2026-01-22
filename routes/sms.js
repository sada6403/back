const express = require('express');
const router = express.Router();
const { sendSMS } = require('../utils/smsService');
const Member = require('../models/Member'); // Assuming you have a Member model
const Manager = require('../models/Manager');
const FieldVisitor = require('../models/FieldVisitor');

// SEND SINGLE OR BULK SMS
router.post('/send', async (req, res) => {
    const { recipients, message, groups } = req.body;
    // recipients: ['077...','071...'] (optional specific list)
    // groups: ['managers', 'field_visitors', 'members'] (optional groups)

    if (!message) {
        return res.status(400).json({ success: false, message: 'Message content is required' });
    }

    let phoneNumbers = [];

    try {
        // 1. Collect numbers from specific list
        if (recipients && Array.isArray(recipients)) {
            phoneNumbers = [...recipients];
        }

        // 2. Collect numbers from Groups
        if (groups && Array.isArray(groups)) {
            if (groups.includes('managers')) {
                const managers = await Manager.find({}, 'phone');
                phoneNumbers.push(...managers.map(m => m.phone));
            }
            if (groups.includes('field_visitors')) {
                const fvs = await FieldVisitor.find({}, 'phone');
                phoneNumbers.push(...fvs.map(f => f.phone));
            }
            if (groups.includes('members')) {
                // Assuming Member model exists and has phone
                // const members = await Member.find({}, 'phone');
                // phoneNumbers.push(...members.map(m => m.phone));

                // Note: If Member model isn't ready, we skip or mock
                console.log("Member sending not fully implemented yet without Member model confirmation");
            }
        }

        // Remove duplicates and filter invalid
        phoneNumbers = [...new Set(phoneNumbers)].filter(p => p && p.length > 9);

        if (phoneNumbers.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid recipients found' });
        }

        console.log(`Sending SMS to ${phoneNumbers.length} recipients`);

        // 3. Send SMS (Looping - Mobitel might support bulk, but single loop is safer for simple integration)
        // Ideally use a queue for large numbers
        let successCount = 0;
        let failCount = 0;

        // Using map to fire requests in parallel (be careful with rate limits)
        const promises = phoneNumbers.map(phone => sendSMS(phone, message)
            .then(() => successCount++)
            .catch((e) => {
                console.error(`Failed to send to ${phone}:`, e);
                failCount++;
            })
        );

        await Promise.all(promises);

        res.json({
            success: true,
            message: `Processed ${phoneNumbers.length} messages`,
            details: { sent: successCount, failed: failCount }
        });

    } catch (err) {
        console.error('Bulk SMS Error:', err);
        res.status(500).json({ success: false, message: 'Internal Server Error', error: err.message });
    }
});

module.exports = router;
