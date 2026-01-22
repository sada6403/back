const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

// Helper to get Branch Code
const getBranchCode = (branchName) => {
    const name = branchName.toLowerCase();
    if (name.includes('kalmunai')) return 'KM';
    if (name.includes('trincomalee')) return 'TR';
    if (name.includes('chavakachcheri')) return 'JS';
    if (name.includes('kondavil')) return 'JK';
    return 'GEN'; // Default Generic
};

// Helper to get Role Code
const getRoleCode = (role) => {
    const r = role.toLowerCase().replace(' ', '_');
    if (r === 'manager') return 'MGR';
    if (r === 'field_visitor') return 'FV';
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

// GET all employees (Aggregated from sub-collections)
router.get('/', async (req, res) => {
    try {
        const [managers, fieldVisitors, branchManagers, employees] = await Promise.all([
            Manager.find(),
            FieldVisitor.find(),
            BranchManager.find(),
            Employee.find() // Keep original too just in case
        ]);

        // Return structured data as expected by Frontend EmployeeService
        res.json({
            success: true,
            data: {
                managers,
                fieldVisitors,
                branchManagers,
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
        accountHolder
    } = req.body;

    try {
        // 1. Determine Target Model based on Role
        let TargetModel = Employee; // Default
        const normalizedRole = role.toLowerCase().replace(' ', '_'); // handle 'Field Visitor' -> 'field_visitor'

        if (normalizedRole === 'manager') TargetModel = Manager;
        if (normalizedRole === 'field_visitor') TargetModel = FieldVisitor;
        if (normalizedRole.includes('branch') || normalizedRole === 'branch_manager') TargetModel = BranchManager;

        // 1. Determine Codes
        const roleCode = getRoleCode(normalizedRole);
        const branchCode = getBranchCode(branchName);

        // 2. Count existing employees IN THAT SPECIFIC COLLECTION to generate ID
        // Regex to match e.g. MGR-KM-
        const prefix = `${roleCode}-${branchCode}-`;

        // Find the latest user with this prefix to increment
        const lastUser = await TargetModel.findOne({ userId: new RegExp(`^${prefix}`) })
            .sort({ createdAt: -1 });

        let nextNum = 1;
        if (lastUser) {
            const parts = lastUser.userId.split('-');
            const numPart = parts[parts.length - 1]; // 000001
            nextNum = parseInt(numPart) + 1;
        }

        const userId = `${prefix}${String(nextNum).padStart(6, '0')}`;
        const branchId = `branch-${branchCode}-${String(nextNum).padStart(3, '0')}`;

        // 3. Generate Password
        const plainPassword = generatePassword(8);
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        // 4. Create Employee Object using the correct Model
        const newEmployee = new TargetModel({
            userId,
            fullName,
            email,
            phone,
            dob,
            role,
            position: role, // Default position name to role
            salary,
            branchName,
            branchId,
            joinedDate,
            password: hashedPassword,
            status: 'active',
            bankName,
            bankBranch,
            accountNo,
            accountHolder
        });

        const savedEmployee = await newEmployee.save();

        // 5. Send Email
        const mailOptions = {
            from: process.env.EMAIL_USER || 'abisivan1827@gmail.com',
            to: email, // Send to the new employee's email
            subject: 'Welcome to NF IT - Your Credentials',
            text: `
                Welcome ${fullName}!
                
                Your account has been created.
                
                User ID: ${userId}
                Password: ${plainPassword}
                Role: ${role}
                Branch: ${branchName}
                
                Please keep these credentials safe.
            `
        };

        // Don't block response on email
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log('Error sending email:', error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });

        res.status(201).json(savedEmployee);

    } catch (err) {
        console.error('Error creating employee:', err);
        res.status(400).json({ message: err.message });
    }
});

// PUT update employee
router.put('/:id', async (req, res) => {
    try {
        const models = [Manager, FieldVisitor, BranchManager, Employee];
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
        const models = [Manager, FieldVisitor, BranchManager, Employee];
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
