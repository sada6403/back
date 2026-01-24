const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const fs = require('fs');

// Models
const Employee = require('../models/Employee');
const Manager = require('../models/Manager');
const FieldVisitor = require('../models/FieldVisitor');
const BranchManager = require('../models/BranchManager');
const ITSector = require('../models/ITSector');

// Multer Setup
const upload = multer({ dest: 'uploads/' });

// Email Transporter (Reusable)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Helpers
const generatePassword = (length = 8) => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
    let retVal = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
};

const getRoleCode = (role) => {
    const r = role.toLowerCase().replace(/ /g, '_');
    if (r.includes('manager')) return 'MGR';
    if (r.includes('field')) return 'FV';
    return 'EMP';
};

const getBranchCode = (branch) => {
    if (!branch) return 'GEN';
    const b = branch.toLowerCase();
    if (b.includes('kalmunai')) return 'KM';
    if (b.includes('trincomalee')) return 'TR';
    if (b.includes('chavakachcheri')) return 'JS';
    if (b.includes('kondavil')) return 'JK';
    return branch.substring(0, 2).toUpperCase();
};

const generateUserId = async (TargetModel, role, branch) => {
    const roleCode = getRoleCode(role);
    const branchCode = getBranchCode(branch);
    const prefix = `${roleCode}-${branchCode}-`;

    // Find latest ID with this prefix
    const lastUser = await TargetModel.findOne({ userId: new RegExp(`^${prefix}`) })
        .sort({ userId: -1 })
        .collation({ locale: 'en_US', numericOrdering: true });

    let nextNum = 1;
    if (lastUser && lastUser.userId) {
        const parts = lastUser.userId.split('-');
        const numPart = parts[parts.length - 1]; // Last part is number
        if (!isNaN(numPart)) {
            nextNum = parseInt(numPart) + 1;
        }
    }
    return `${prefix}${String(nextNum).padStart(6, '0')}`;
};

// POST /api/bulk/employees
router.post('/employees', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const results = { success: 0, failed: 0, errors: [] };

    try {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        let data = xlsx.utils.sheet_to_json(sheet);

        // Normalize Keys (Trim spaces, Lowercase) if needed, but assuming headers match fairly well
        // Standard Headers Expected: Name, Email, Phone, Role, Branch, Salary...

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const rowIndex = i + 2; // Excel row number (1-based, header is 1)

            try {
                // 1. Basic Validation
                if (!row['Name'] && !row['Full Name']) throw new Error('Name is required');
                // if (!row['Email']) throw new Error('Email is required'); // Maybe optional? But needed for auth sending

                const fullName = row['Name'] || row['Full Name'];
                const email = row['Email'] ? row['Email'].toString().trim().toLowerCase() : '';

                // Phone Validation
                let phone = row['Phone'] ? row['Phone'].toString().replace(/\D/g, '') : '';
                if (!phone) throw new Error('Phone number is required');
                if (phone.length !== 10) {
                    throw new Error(`Phone number must be exactly 10 digits. Found: ${row['Phone']}`);
                }

                const role = row['Role'] ? row['Role'].toString().trim() : 'Employee';
                const branch = row['Branch'] || row['Branch Name'] || '';
                const salary = row['Salary'] ? parseFloat(row['Salary']) : 0;

                // NIC Validation
                const nic = row['NIC'] ? row['NIC'].toString().trim() : '';
                if (nic && nic.length > 12) {
                    throw new Error(`NIC must be 12 characters or less. Found: ${nic}`);
                }

                // 2. Determine Collection
                let TargetModel = Employee;
                const rLower = role.toLowerCase();

                if (rLower.includes('branch manager')) TargetModel = BranchManager;
                else if (rLower.includes('field visitor')) TargetModel = FieldVisitor;
                else if (rLower.includes('it sector')) TargetModel = ITSector;
                else if (rLower.includes('manager')) TargetModel = Manager; // General Manager

                // 3. Check for Existing User (Upsert Logic)
                let userStartQuery = {};
                // Priority: ID -> Email
                if (row['User ID'] || row['ID']) {
                    const uid = (row['User ID'] || row['ID']).toString().trim();
                    userStartQuery = { userId: uid };
                } else if (email) {
                    userStartQuery = { email: email };
                } else {
                    // Fallback to Phone?
                    userStartQuery = { phone: phone };
                }

                let existingUser = await TargetModel.findOne(userStartQuery);

                let isNew = false;
                let password = '';
                let userId = '';

                if (existingUser) {
                    // --- UPDATE ---
                    userId = existingUser.userId;
                    existingUser.fullName = fullName;
                    if (phone) existingUser.phone = phone;
                    if (salary) existingUser.salary = salary;
                    if (branch) existingUser.branchName = branch;
                    if (row['Bank Name']) existingUser.bankName = row['Bank Name'];
                    if (row['Account No']) existingUser.accountNo = row['Account No'];

                    // Don't change password or ID on update usually
                    await existingUser.save();
                } else {
                    // --- CREATE ---
                    isNew = true;
                    userId = await generateUserId(TargetModel, role, branch);
                    password = generatePassword();
                    const hashedPassword = await bcrypt.hash(password, 10);

                    existingUser = new TargetModel({
                        userId,
                        fullName,
                        email,
                        phone,
                        role,
                        branchName: branch,
                        salary,
                        password: hashedPassword,
                        status: 'active',
                        joinedDate: new Date(),
                        // Map extra fields
                        bankName: row['Bank Name'] || '',
                        bankBranch: row['Bank Branch'] || '',
                        accountNo: row['Account No'] || '',
                        accountHolder: row['Account Holder'] || fullName,
                        nic: row['NIC'] || '',
                        civilStatus: row['Civil Status'] || '',
                        postalAddress: row['Address'] || ''
                    });

                    await existingUser.save();
                }

                // 4. Send Email (If New OR Requested)
                // Sending email for Updates too? User said "update eathum iruntha update aaganum... link ellam ... mail ku poora maari"
                // It implies always sending credentials or at least a notification.
                // Sending credentials (password) is only possible if we generated it (New User).
                // Existing users match by Email, so we don't know their password. We can only say "Details Updated".

                if (email) {
                    let subject = '';
                    let text = '';

                    if (isNew) {
                        subject = 'Welcome to NF IT - Account Created';
                        text = `Hello ${fullName},\n\nYour account has been created successfully.\n\nUser ID: ${userId}\nPassword: ${password}\nRole: ${role}\n\nPlease login to the app.`;
                    } else {
                        subject = 'NF IT - Account Updated';
                        text = `Hello ${fullName},\n\nYour account details for User ID: ${userId} have been updated by the administrator.\n\nIf you did not request this, please contact support.`;
                    }

                    transporter.sendMail({
                        from: process.env.EMAIL_USER,
                        to: email,
                        subject: subject,
                        text: text
                    }, (err, info) => {
                        if (err) console.error('Email Fail:', err);
                    });
                }

                results.success++;

            } catch (rowErr) {
                console.error(`Row ${rowIndex} Error:`, rowErr.message);
                results.failed++;
                results.errors.push({ row: rowIndex, error: rowErr.message });
            }
        }

        res.json({ success: true, results });

    } catch (e) {
        console.error('Bulk Upload Error:', e);
        res.status(500).json({ success: false, message: e.message });
    } finally {
        // Cleanup
        if (filePath) fs.unlink(filePath, () => { });
    }
});

module.exports = router;
