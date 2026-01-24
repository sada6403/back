const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

const mongoose = require('mongoose'); // Required for dynamic models

// Helper to get Branch Code ( synced with bulkRoutes.js )
const getBranchCode = (branchName) => {
    if (!branchName) return 'GEN';
    const b = branchName.toLowerCase().trim();

    // Explicit Mapping
    if (b.includes('jaffna') && b.includes('kondavil')) return 'JK';
    if (b.includes('jaffna') && b.includes('chavakachcheri')) return 'JS';
    if (b.includes('kondavil') && !b.includes('jaffna')) return 'JK';
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
    const clean = branchName.replace(/[^a-zA-Z]/g, '').toUpperCase();
    if (clean.length >= 2) return clean.substring(0, 2);

    return 'GEN';
};

// Helper to get Role Code
const getRoleCode = (role) => {
    const r = role.toLowerCase();
    if (r.includes('branch manager')) return 'BM';
    if (r.includes('manager')) return 'BM';
    if (r.includes('field')) return 'FV';
    return 'EMP';
};

// Helper to generate Password
const generatePassword = (length = 8) => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
    let retVal = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
};

// Start Email Transporter
// NOTE: User must provide EMAIL_USER and EMAIL_PASS in .env
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Models for specific collections
const Manager = require('../models/Manager');
const FieldVisitor = require('../models/FieldVisitor');
const BranchManager = require('../models/BranchManager');

const ITSector = require('../models/ITSector');

// GET all employees (Aggregated from sub-collections)
router.get('/', async (req, res) => {
    try {
        const [managers, fieldVisitors, branchManagers, itSectors, employees] = await Promise.all([
            Manager.find(),
            FieldVisitor.find(),
            BranchManager.find(),
            ITSector.find(),
            Employee.find() // Keep original too just in case
        ]);

        // Return structured data as expected by Backend EmployeeService
        res.json({
            success: true,
            data: {
                managers,
                fieldVisitors,
                branchManagers,
                itSectors,
                employees
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST create new employee
router.post('/', async (req, res) => {
    const {
        fullName,
        email,
        phone,
        dob,
        role,
        salary,
        branchName,
        joinedDate,
        bankName,
        bankBranch,
        accountNo,
        accountHolder,
        assignedArea, // Added
        nic,
        civilStatus,
        gender,
        postalAddress,
        permanentAddress,
        education,
        workExperience,
        references
    } = req.body;

    try {
        // 1. Determine Target Model based on Role & Dynamic Logic
        let TargetModel = Employee; // Default
        const rLower = role.toLowerCase();

        if (rLower.includes('branch manager') ||
            (rLower.includes('manager') && !rLower.includes('field') && !rLower.includes('it sector'))) {
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
                // Define a generic schema for dynamic roles
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
                    // Allow flexible fields
                }, { strict: false, collection: collectionName });
                TargetModel = mongoose.model(collectionName, GenericSchema);
            }
        }

        // 2. Determine Codes
        const roleCode = getRoleCode(role);
        const branchCode = getBranchCode(branchName);

        // 3. Generate ID (Logic from bulkRoutes)
        const prefix = `${roleCode}-${branchCode}-`;

        // Find the latest user with this prefix to increment
        // Use collation for numeric sorting if possible, or just sort textually and hope for best (or fetch all and sort in memory if needed, but regex sort usually okay for fixed width)
        // Note: bulkRoutes uses collation numericOrdering: true. Let's try to match that if Mongo supports it here.

        const lastUser = await TargetModel.findOne({ userId: new RegExp(`^${prefix}`) })
            .sort({ userId: -1 })
            .collation({ locale: 'en_US', numericOrdering: true });

        let nextNum = 1;
        if (lastUser && lastUser.userId) {
            const parts = lastUser.userId.split('-');
            const numPart = parts[parts.length - 1]; // 000001
            if (!isNaN(numPart)) {
                nextNum = parseInt(numPart) + 1;
            }
        }

        const userId = `${prefix}${String(nextNum).padStart(3, '0')}`;
        // branchId logic: Keep old style or update? Old was "branch-KM-001".
        // Let's keep it simply consistent or just reuse userId logic if used for auth.
        // But schema has branchId. Let's make it consistent.
        const branchId = `branch-${branchCode}-${String(nextNum).padStart(3, '0')}`;

        // 4. Generate Password
        const plainPassword = generatePassword(8);
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        // 5. Create Employee Object
        // Using generic object structure to support dynamic models
        const userData = {
            userId,
            fullName,
            email,
            phone,
            dob,
            role,
            position: role,
            branchName,
            branchId,
            salary,
            password: hashedPassword,
            status: 'active',
            joinedDate: joinedDate || new Date(),
            bankName,
            bankBranch,
            accountNo,
            accountHolder,
            assignedArea,
            nic,
            civilStatus,
            gender,
            postalAddress,
            permanentAddress,
            education,
            workExperience,
            references
        };

        let newEmployee;
        if (TargetModel.schema && TargetModel.schema.options.strict === false) {
            newEmployee = new TargetModel(userData);
        } else {
            // Explicit for known models
            newEmployee = new TargetModel({
                userId, fullName, email, phone, dob, role, position: role,
                branchName, branchId, salary, password: hashedPassword, status: 'active',
                joinedDate: joinedDate || new Date(),
                bankName, bankBranch, accountNo, accountHolder, assignedArea,
                nic, civilStatus, gender, postalAddress, permanentAddress,
                education, workExperience, references
            });
        }

        const savedEmployee = await newEmployee.save();

        // 6. Send Email (HTML)
        // Reusing the HTML template logic from bulkRoutes would be ideal, but let's inline it for now or make it a shared helper later.
        // For now, I'll update it to be HTML to match the bulk upload experience.
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
                            Your account has been successfully created.
                        </p>
                        
                        <div style="background-color: #f8f9fa; border-left: 4px solid #4CAF50; padding: 15px; margin: 20px 0;">
                            <p style="margin: 5px 0;"><strong>User ID:</strong> ${userId}</p>
                            <p style="margin: 5px 0;"><strong>Password:</strong> ${plainPassword}</p>
                            <p style="margin: 5px 0;"><strong>Role:</strong> ${role}</p>
                            <p style="margin: 5px 0;"><strong>Branch:</strong> ${branchName}</p>
                        </div>
                        
                        <p style="color: #555555; line-height: 1.6;">
                            Please click the button below to get started and access the necessary documents:
                        </p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${startLink}" style="background-color: #4CAF50; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Get Started</a>
                        </div>
                    </div>
                    <div style="background-color: #f1f1f1; padding: 15px; text-align: center;">
                        <p style="color: #888888; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} Nature Farming. All rights reserved.</p>
                    </div>
                </div>
            `;

            const mailOptions = {
                from: process.env.EMAIL_USER || 'abisivan1827@gmail.com',
                to: email,
                subject: 'Welcome to Nature Farming - Your Credentials',
                html: htmlContent
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.log('Error sending email:', error);
                } else {
                    console.log('Email sent: ' + info.response);
                }
            });
        }

        res.status(201).json(savedEmployee);

    } catch (err) {
        console.error('Error creating employee:', err);
        // Better error message for duplicate keys
        if (err.code === 11000) {
            return res.status(400).json({
                message: `Duplicate ID Error: The System tried to generate ID ${err.keyValue?.userId || 'Unknown'} but it already exists. Please try again.`
            });
        }
        res.status(400).json({ message: err.message });
    }
});

// PUT update employee
router.put('/:id', async (req, res) => {
    try {
        const models = [Manager, FieldVisitor, BranchManager, ITSector, Employee];
        let updated = null;

        for (const model of models) {
            updated = await model.findOneAndUpdate(
                { userId: req.params.id }, // Use userId to find
                req.body,
                { new: true }
            );
            if (updated) break; // Found and updated
        }

        if (!updated) {
            // Try by _id if userId fail (fallback)
            for (const model of models) {
                updated = await model.findByIdAndUpdate(req.params.id, req.body, { new: true });
                if (updated) break;
            }
        }

        if (!updated) {
            return res.status(404).json({ message: 'Employee not found' });
        }
        res.json(updated);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE
router.delete('/:id', async (req, res) => {
    try {
        const models = [Manager, FieldVisitor, BranchManager, ITSector, Employee];
        let deleted = null;

        for (const model of models) {
            deleted = await model.findOneAndDelete({ userId: req.params.id });
            if (deleted) break;
        }

        if (!deleted) {
            for (const model of models) {
                deleted = await model.findByIdAndDelete(req.params.id);
                if (deleted) break;
            }
        }

        if (!deleted) {
            return res.status(404).json({ message: 'Not found' });
        }
        res.json({ message: 'Employee deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
