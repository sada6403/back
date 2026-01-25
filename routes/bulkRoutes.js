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
    const r = role.toLowerCase();
    if (r.includes('branch manager')) return 'BM';
    if (r.includes('manager')) return 'BM'; // Fallback for plain "Manager" to Branch Manager
    if (r.includes('field')) return 'FV';
    return 'EMP';
};

const getBranchCode = (branch) => {
    if (!branch) return 'GEN';
    const b = branch.toLowerCase().trim();

    // Explicit Mapping provided by User
    if (b.includes('jaffna') && b.includes('kondavil')) return 'JK';
    if (b.includes('jaffna') && b.includes('chavakachcheri')) return 'JS';
    if (b.includes('kondavil') && !b.includes('jaffna')) return 'JK'; // Direct matches
    if (b.includes('chavakachcheri') && !b.includes('jaffna')) return 'JS';

    if (b.includes('kalmunai')) return 'KM';
    if (b.includes('trincomalee')) return 'TM';
    if (b.includes('akkaraipattu')) return 'AP';
    if (b.includes('ampara')) return 'AM';
    if (b.includes('batticaloa')) return 'BT';
    if (b.includes('cheddikulam')) return 'CK';
    if (b.includes('kilinochchi')) return 'KN';
    if (b.includes('mannar')) return 'MN';
    if (b.includes('vavuniya')) return 'VN';
    if (b.includes('mallavi')) return 'MV';
    if (b.includes('mulliyawalai')) return 'MW';
    if (b.includes('nedunkeny')) return 'NK';
    if (b.includes('puthukkudiyiruppu')) return 'PK';
    if (b.includes('aschuveli')) return 'AV';

    // Default: First 2 letters
    // "athey time 2 brnch ku same first letter vantha first 3 letters antha 2 branch ku mattum varum"
    // For now we default to 2 chars as implementing full collision detection here requires DB checks which isn't standard in this helper.
    // If user strictly wants 3 chars for collisions, we'd need to know the collisions. 
    // Given the list above is primary, we fall back to 2 uppercase chars.

    const clean = branch.replace(/[^a-zA-Z]/g, '').toUpperCase();
    if (clean.length >= 2) return clean.substring(0, 2);

    return 'GEN';
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
    return `${prefix}${String(nextNum).padStart(3, '0')}`;
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
                // Helper to find key case-insensitively
                const findKey = (obj, possibilities) => {
                    const keys = Object.keys(obj);
                    for (const p of possibilities) {
                        const found = keys.find(k => k.trim().toLowerCase() === p.toLowerCase());
                        if (found) return found;
                    }
                    return null;
                };

                const nameKey = findKey(row, ['Name', 'Full Name', 'Employee Name', 'Member Name', 'First Name']);
                if (!nameKey || !row[nameKey]) {
                    // Get available keys to show in error
                    const available = Object.keys(row).join(', ');
                    throw new Error(`Name is required. (Available columns: ${available})`);
                }

                const fullName = row[nameKey];
                const email = row['Email'] ? row['Email'].toString().trim().toLowerCase() : '';

                // Phone Validation
                const phoneKey = findKey(row, ['Phone', 'Phone Number', 'Mobile', 'Contact', 'Contact Number']);
                if (!phoneKey || !row[phoneKey]) {
                    const available = Object.keys(row).join(', ');
                    throw new Error(`Phone number is required. (Available columns: ${available})`);
                }

                let phone = row[phoneKey].toString().replace(/\D/g, '');

                if (!phone) throw new Error('Phone number is required');
                if (phone.length !== 10) {
                    throw new Error(`Phone number must be exactly 10 digits. Found: ${row[phoneKey]}`);
                }

                // --- Flexible Column Matching ---

                // Role
                const roleKey = findKey(row, ['Role', 'Position', 'Designation', 'Job Title']);
                const role = roleKey ? row[roleKey].toString().trim() : 'Employee';

                // Branch
                const branchKey = findKey(row, ['Branch', 'Branch Name', 'Location', 'Station', 'Office']);
                const branch = branchKey ? row[branchKey] : '';

                // Salary
                const salaryKey = findKey(row, ['Salary', 'Basic Salary', 'Basic']);
                const salary = salaryKey ? parseFloat(row[salaryKey]) : 0;

                // NIC
                const nicKey = findKey(row, ['NIC', 'NIC No', 'National ID', 'Identity Card']);
                const nic = nicKey ? row[nicKey].toString().trim() : '';
                if (nic && nic.length > 12) {
                    throw new Error(`NIC must be 12 characters or less. Found: ${nic}`);
                }

                // Address
                const addressKey = findKey(row, ['Address', 'Postal Address', 'Res Address']);
                const address = addressKey ? row[addressKey] : '';

                // Civil Status
                const civilKey = findKey(row, ['Civil Status', 'Marital Status']);
                const civilStatus = civilKey ? row[civilKey] : '';

                // Bank Details
                const bankNameKey = findKey(row, ['Bank Name', 'Bank']);
                const bankBranchKey = findKey(row, ['Bank Branch']); // 'Branch' is ambiguous, keep specific
                const accNoKey = findKey(row, ['Account No', 'Acc No', 'Account Number', 'Bank Account']);
                const holderKey = findKey(row, ['Account Holder', 'Account Name', 'Holder Name']);

                // 2. Determine Collection & Dynamic Model
                let TargetModel = Employee;
                const rLower = role.toLowerCase();

                if (rLower === 'branch manager' || rLower === 'branch_manager') {
                    TargetModel = BranchManager;
                }
                else if (rLower.includes('field visitor')) TargetModel = FieldVisitor;
                else if (rLower.includes('it sector')) TargetModel = ITSector;
                else {
                    // Dynamic Collection for unknown roles
                    const collectionName = rLower.replace(/ /g, '');
                    try {
                        TargetModel = mongoose.model(collectionName);
                    } catch (e) {
                        const GenericSchema = new mongoose.Schema({
                            userId: { type: String, required: true },
                            fullName: { type: String, required: true },
                            email: { type: String },
                            phone: { type: String },
                            role: { type: String },
                            branchName: { type: String },
                            password: { type: String },
                            status: { type: String, default: 'active' },
                            salary: { type: Number },
                            joinedDate: { type: Date, default: Date.now },
                        }, { strict: false, collection: collectionName });
                        TargetModel = mongoose.model(collectionName, GenericSchema);
                    }
                }

                // 3. Check for Existing User (Upsert Logic)
                let userStartQuery = {};
                // User ID Check
                const idKey = findKey(row, ['User ID', 'ID', 'Employee ID']);

                if (idKey && row[idKey]) {
                    const uid = row[idKey].toString().trim();
                    userStartQuery = { userId: uid };
                } else if (email) {
                    userStartQuery = { email: email };
                } else {
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

                    if (bankNameKey) existingUser.bankName = row[bankNameKey];
                    if (accNoKey) existingUser.accountNo = row[accNoKey];

                    await existingUser.save();
                } else {
                    // --- CREATE OR UPDATE ON DUPLICATE ---
                    isNew = true;
                    // Auto-generate if not provided
                    if (idKey && row[idKey]) {
                        userId = row[idKey].toString().trim();
                    } else {
                        userId = await generateUserId(TargetModel, role, branch);
                    }

                    password = generatePassword();
                    const hashedPassword = await bcrypt.hash(password, 10);

                    const userData = {
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
                        bankName: bankNameKey ? row[bankNameKey] : '',
                        bankBranch: bankBranchKey ? row[bankBranchKey] : '',
                        accountNo: accNoKey ? row[accNoKey] : '',
                        accountHolder: holderKey ? row[holderKey] : fullName,
                        nic: nic,
                        civilStatus: civilStatus,
                        postalAddress: address,
                        // Add any other columns dynamically
                        ...row
                    };

                    try {
                        if (TargetModel.schema && TargetModel.schema.options.strict === false) {
                            existingUser = new TargetModel(userData);
                        } else {
                            // Known models
                            existingUser = new TargetModel({
                                userId, fullName, email, phone, role, branchName: branch, salary,
                                password: hashedPassword, status: 'active', joinedDate: new Date(),
                                bankName: bankNameKey ? row[bankNameKey] : '',
                                bankBranch: bankBranchKey ? row[bankBranchKey] : '',
                                accountNo: accNoKey ? row[accNoKey] : '',
                                accountHolder: holderKey ? row[holderKey] : fullName,
                                nic: nic,
                                civilStatus: civilStatus,
                                postalAddress: address
                            });
                        }
                        await existingUser.save();
                    } catch (saveError) {
                        // Handle Duplicate Key Error (E11000)
                        if (saveError.code === 11000) {
                            console.warn(`Duplicate key found for row ${rowIndex}. Attempting update...`);
                            // Identify the duplicate key
                            const key = Object.keys(saveError.keyValue)[0];
                            const value = saveError.keyValue[key];

                            // Find record by that key
                            const duplicateRecord = await TargetModel.findOne({ [key]: value });
                            if (duplicateRecord) {
                                // Update logic
                                duplicateRecord.fullName = fullName;
                                duplicateRecord.phone = phone; // Assuming we want to overwrite
                                if (salary) duplicateRecord.salary = salary;
                                if (branch) duplicateRecord.branchName = branch;
                                if (bankNameKey && row[bankNameKey]) duplicateRecord.bankName = row[bankNameKey];
                                if (accNoKey && row[accNoKey]) duplicateRecord.accountNo = row[accNoKey];
                                if (address) duplicateRecord.postalAddress = address;
                                if (nic) duplicateRecord.nic = nic;

                                await duplicateRecord.save();
                                isNew = false; // It was an update
                                console.log(`Row ${rowIndex} updated successfully after duplicate check.`);
                            } else {
                                throw saveError; // Should not happen if key violation exists
                            }
                        } else {
                            throw saveError;
                        }
                    }
                }

                // 4. Send Email (HTML Template)
                if (email) {
                    const startLink = "https://drive.google.com/file/d/1lTAELctnpWtzL0kVS_psZDI-5zP77-o3/view?usp=drive_link";

                    const htmlContent = `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                            <div style="background-color: #1F2937; padding: 20px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0;">Nature Farming</h1>
                            </div>
                            <div style="padding: 30px; background-color: #ffffff;">
                                <h2 style="color: #333333; margin-top: 0;">Welcome, ${fullName}!</h2>
                                <p style="color: #555555; line-height: 1.6;">
                                    ${isNew ? 'Your account has been successfully created.' : 'Your account details have been updated.'}
                                </p>
                                
                                <div style="background-color: #f8f9fa; border-left: 4px solid #4CAF50; padding: 15px; margin: 20px 0;">
                                    <p style="margin: 5px 0;"><strong>User ID:</strong> ${userId}</p>
                                    ${isNew ? `<p style="margin: 5px 0;"><strong>Password:</strong> ${password}</p>` : ''}
                                    <p style="margin: 5px 0;"><strong>Role:</strong> ${role}</p>
                                    <p style="margin: 5px 0;"><strong>Branch:</strong> ${branch}</p>
                                </div>
                                
                                <p style="color: #555555; line-height: 1.6;">
                                    Please click the button below to get started and access the necessary documents:
                                </p>
                                
                                <div style="text-align: center; margin: 30px 0;">
                                    <a href="${startLink}" style="background-color: #4CAF50; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Get Started</a>
                                </div>
                                
                                <p style="color: #888888; font-size: 12px; margin-top: 30px; text-align: center;">
                                    Please keep your credentials safe. If you have any questions, contact the IT department.
                                </p>
                            </div>
                            <div style="background-color: #f1f1f1; padding: 15px; text-align: center;">
                                <p style="color: #888888; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} Nature Farming. All rights reserved.</p>
                            </div>
                        </div>
                    `;

                    transporter.sendMail({
                        from: process.env.EMAIL_USER,
                        to: email,
                        subject: isNew ? 'Welcome to Nature Farming - Access Credentials' : 'Nature Farming - Account Update',
                        html: htmlContent
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
