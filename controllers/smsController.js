const { sendSMS } = require('../utils/smsService');
const BranchManager = require('../models/BranchManager');
const FieldVisitor = require('../models/FieldVisitor');
const ITSector = require('../models/ITSector'); // Admin/IT

// @desc    Send Bulk SMS
// @route   POST /api/sms/bulk
// @access  Private (Admin/Manager)
const sendBulkSMS = async (req, res) => {
    try {
        let { numbers, recipients, message, criteria, sendViaEmail, roles } = req.body;
        // Parse parsed fields if coming from FormData (Multipart) which converts everything to strings
        if (typeof criteria === 'string') {
            try { criteria = JSON.parse(criteria); } catch (e) { }
        }
        // If roles is sent directly (e.g. from frontend MultipartRequest)
        if (!criteria && roles) {
            let parsedRoles = roles;
            if (typeof roles === 'string') {
                try { parsedRoles = JSON.parse(roles); } catch (e) { }
            }
            criteria = { roles: parsedRoles };
        }

        if (typeof sendViaEmail === 'string') {
            sendViaEmail = sendViaEmail === 'true';
        }

        const file = req.file; // Attachment

        // If Email Mode
        if (sendViaEmail) {
            const nodemailer = require('nodemailer');
            const Member = require('../models/Member'); // Ensure imported

            // 1. Gather Emails
            let targetEmails = [];

            if (criteria && criteria.roles) {
                const roles = criteria.roles.map(r => r.toLowerCase());

                for (const role of roles) {
                    let users = [];
                    if (role === 'manager') {
                        users = await BranchManager.find({ email: { $exists: true, $ne: '' } }, 'email');
                    } else if (role === 'field_visitor' || role === 'field') {
                        users = await FieldVisitor.find({ email: { $exists: true, $ne: '' } }, 'email');
                    } else if (role === 'member') {
                        users = await Member.find({ email: { $exists: true, $ne: '' } }, 'email');
                    }
                    if (users.length > 0) {
                        targetEmails.push(...users.map(u => u.email));
                    }
                }
            }

            // Deduplicate
            targetEmails = [...new Set(targetEmails)];

            if (targetEmails.length === 0) {
                return res.status(400).json({ success: false, message: 'No valid email addresses found for selected groups.' });
            }

            // 2. Setup Transporter
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });

            // 3. Prepare Attachments
            const attachments = [];
            // Logo CID
            attachments.push({
                filename: 'logo.png',
                path: 'public/images/logo.png',
                cid: 'companylogo' // same cid value as in the html img src
            });
            // User File
            if (file) {
                attachments.push({
                    filename: file.originalname,
                    path: file.path
                });
            }

            // 4. Send Mails (Loop or BCC?)
            // BCC is better for bulk to save individual sending time/limit, but individual is more personal.
            // Using BCC for efficiency.

            const mailOptions = {
                from: `"Nature Farming" <${process.env.EMAIL_USER}>`,
                bcc: targetEmails,
                subject: 'Message from Management',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0;">
                        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
                            <img src="cid:companylogo" alt="Nature Farming Logo" style="max-width: 150px;">
                        </div>
                        <div style="padding: 30px; background-color: #ffffff;">
                            <h2 style="color: #2c3e50; margin-top: 0;">Hello,</h2>
                            <p style="color: #555555; font-size: 16px; line-height: 1.6; white-space: pre-wrap;">${message}</p>
                            
                            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
                            <p style="color: #999999; font-size: 12px; text-align: center;">
                                © ${new Date().getFullYear()} Nature Farming. All rights reserved.<br>
                                This is an automated message.
                            </p>
                        </div>
                    </div>
                `,
                attachments: attachments
            };

            await transporter.sendMail(mailOptions);

            // Cleanup uploaded file
            if (file) {
                const fs = require('fs');
                fs.unlink(file.path, (err) => { if (err) console.error('Failed to delete temp file', err); });
            }

            return res.json({
                success: true,
                message: `Email sent successfully to ${targetEmails.length} recipients.`
            });

        } else {
            // SMS / Notification Mode (Existing Logic)
            // ... (keep existing SMS logic) ...
            let targetNumbers = [];

            // 1. Add direct numbers/recipients
            if (numbers && Array.isArray(numbers)) targetNumbers.push(...numbers);
            if (recipients && Array.isArray(recipients)) targetNumbers.push(...recipients);

            // 2. Fetch from Criteria (e.g. Role)
            if (criteria) {
                let rolesToFetch = [];

                // Handle single role
                if (criteria.role) rolesToFetch.push(criteria.role.toLowerCase());

                // Handle multiple roles array (from bulk_message_screen.dart)
                if (criteria.roles && Array.isArray(criteria.roles)) {
                    rolesToFetch.push(...criteria.roles.map(r => r.toLowerCase()));
                }

                // Deduplicate roles
                rolesToFetch = [...new Set(rolesToFetch)];

                for (const role of rolesToFetch) {
                    let users = [];
                    if (role === 'manager') {
                        users = await BranchManager.find({}, 'phone');
                    } else if (role === 'field_visitor' || role === 'field') {
                        users = await FieldVisitor.find({}, 'phone');
                    } else if (role === 'it_sector' || role === 'admin') {
                        users = await ITSector.find({}, 'phone');
                    } else if (role === 'member') {
                        const Member = require('../models/Member');
                        users = await Member.find({}, 'mobile'); // Member uses 'mobile' not 'phone'
                        // Map 'mobile' to 'phone' for consistency
                        users = users.map(u => ({ phone: u.mobile }));
                    } else if (role === 'all') {
                        const managers = await BranchManager.find({}, 'phone');
                        const fvs = await FieldVisitor.find({}, 'phone');
                        users = [...managers, ...fvs];
                    }

                    if (users && users.length > 0) {
                        targetNumbers.push(...users.map(u => u.phone).filter(p => p));
                    }
                }
            }

            // Deduplicate
            targetNumbers = [...new Set(targetNumbers)];

            if (targetNumbers.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No valid phone numbers found for the selected criteria'
                });
            }

            // Delegate to Service
            const { sendBulk } = require('../utils/smsService');
            // Mock or Real
            // For now, let's assume sendBulk works or we Mock it if puppeteer fails

            // NOTE: In the provided context, the user seems to want this feature "Work" or "Mocked" if services aren't live.
            // But since this is specific to Login/Data, let's keep the logic.

            // Use try-catch for the specific service
            try {
                const results = await sendBulk(targetNumbers, message);
                let msg = `Bulk SMS processing completed. Sent: ${results.success}, Failed: ${results.failed}`;
                if (results.failed > 0 && results.details.length > 0) {
                    const firstError = results.details.find(d => d.status === 'failed')?.error;
                    if (firstError) msg += ` (Reason: ${firstError})`;
                }
                return res.json({ success: true, message: msg, results });
            } catch (svcErr) {
                console.error("SMS Service Failed:", svcErr);
                return res.json({ success: false, message: "SMS Service Failed, but request processed." });
            }
        }
    } catch (error) {
        console.error('Bulk Message Error:', error);
        res.status(500).json({
            success: false,
            message: 'Bulk Message failed',
            error: error.message
        });
    }
};

module.exports = { sendBulkSMS };
