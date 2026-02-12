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
const generatePassword = () => {
    const numbers = "0123456789";
    const symbols = "!@#$%&*";
    const all = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

    let password = "NF";
    // Add 4 random numbers
    for (let i = 0; i < 4; i++) {
        password += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
    // Add 1 random symbol
    password += symbols.charAt(Math.floor(Math.random() * symbols.length));
    // Add 2 random letters
    for (let i = 0; i < 2; i++) {
        password += all.charAt(Math.floor(Math.random() * all.length));
    }
    return password;
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
const Analyzer = require('../models/Analyzer');

// GET all employees (Aggregated from sub-collections)
router.get('/', async (req, res) => {
    try {
        const [managers, fieldVisitors, branchManagers, itSectors, analyzers, employees] = await Promise.all([
            Manager.find(),
            FieldVisitor.find(),
            BranchManager.find(),
            ITSector.find(),
            Analyzer.find(),
            Employee.find() // Keep original too just in case
        ]);

        console.log(`[Employees] Fetched: ${managers.length} Managers, ${fieldVisitors.length} FVs, ${analyzers.length} Analyzers`);

        // Return structured data as expected by Backend EmployeeService
        res.json({
            success: true,
            data: {
                managers,
                fieldVisitors,
                branchManagers,
                itSectors,
                analyzers: analyzers, // Added
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
            (rLower.includes('manager') && !rLower.includes('field') && !rLower.includes('it sector') && !rLower.includes('analyzer'))) {
            TargetModel = BranchManager;
        }
        else if (rLower.includes('field visitor')) TargetModel = FieldVisitor;
        else if (rLower.includes('it sector')) TargetModel = ITSector;
        else if (rLower.includes('analyzer')) TargetModel = Analyzer;
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
        let finalUserId = req.body.userId;
        let finalBranchId = req.body.branchId;

        if (!finalUserId) {
            const prefix = `${roleCode}-${branchCode}-`;
            const lastUser = await TargetModel.findOne({ userId: new RegExp(`^${prefix}`) })
                .sort({ userId: -1 })
                .collation({ locale: 'en_US', numericOrdering: true });

            let nextNum = 1;
            if (lastUser && lastUser.userId) {
                const parts = lastUser.userId.split('-');
                const numPart = parts[parts.length - 1]; // 000
                if (!isNaN(numPart)) {
                    nextNum = parseInt(numPart) + 1;
                }
            }
            finalUserId = `${prefix}${String(nextNum).padStart(3, '0')}`;
            if (!finalBranchId) {
                finalBranchId = `branch-${branchCode}-${String(nextNum).padStart(3, '0')}`;
            }
        }

        // 4. Generate Password
        let finalHashedPassword;
        let plainPassword = req.body.password;
        if (plainPassword) {
            finalHashedPassword = await bcrypt.hash(plainPassword, 10);
        } else {
            plainPassword = generatePassword(8);
            finalHashedPassword = await bcrypt.hash(plainPassword, 10);
        }

        // 5. Create Employee Object
        const userData = {
            ...req.body,
            userId: finalUserId,
            branchId: finalBranchId || req.body.branchId,
            password: finalHashedPassword,
            position: role,
            joinedDate: req.body.joinedDate || new Date(),
            status: req.body.status || 'active'
        };

        const newEmployee = new TargetModel(userData);
        await newEmployee.save();

        // 6. Audit Log
        if (req.user) {
            await AuditService.log({
                userId: req.user.userId,
                action: 'ADD_EMPLOYEE',
                details: `Added new ${role}: ${fullName} (${finalUserId})`,
                timestamp: new Date()
            });
        }

        // 7. Send Email (HTML)
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
                            <p style="margin: 5px 0;"><strong>User ID:</strong> ${finalUserId}</p>
                            <p style="margin: 5px 0;"><strong>Password:</strong> ${plainPassword}</p>
                            <p style="margin: 5px 0;"><strong>Role:</strong> ${role}</p>
                            <p style="margin: 5px 0;"><strong>Branch:</strong> ${branchName || assignedArea || 'N/A'}</p>
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
        const models = [Manager, FieldVisitor, BranchManager, ITSector, Analyzer, Employee];
        let updated = null;

        for (const model of models) {
            // If password is provided in update, hash it
            if (req.body.password && req.body.password.trim() !== "") {
                const salt = await bcrypt.genSalt(10);
                req.body.password = await bcrypt.hash(req.body.password, salt);
            } else {
                delete req.body.password; // Don't overwrite with empty if accidentally sent
            }

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
        const models = [Manager, FieldVisitor, BranchManager, ITSector, Analyzer, Employee];
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

// POST reset password for a specific employee
router.post('/reset-password/:employeeId', async (req, res) => {
    try {
        const id = req.params.employeeId;
        const models = [Manager, FieldVisitor, BranchManager, ITSector, Analyzer, Employee];
        let employee = null;
        let usedModel = null;

        // Find the employee across all collections
        for (const model of models) {
            employee = await model.findOne({ userId: id });
            if (employee) {
                usedModel = model;
                break;
            }
        }

        // Fallback to _id search
        if (!employee) {
            for (const model of models) {
                if (mongoose.Types.ObjectId.isValid(id)) {
                    employee = await model.findById(id);
                    if (employee) {
                        usedModel = model;
                        break;
                    }
                }
            }
        }

        if (!employee) {
            return res.status(404).json({ success: false, message: 'Employee not found' });
        }

        // Generate new password
        const plainPassword = generatePassword(8);
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        // Update password in database
        const updatedEmployee = await usedModel.findOneAndUpdate(
            { userId: employee.userId },
            { $set: { password: hashedPassword } },
            { new: true }
        );

        // Send email with new password
        if (employee.email) {
            const startLink = "https://drive.google.com/file/d/1lTAELctnpWtzL0kVS_psZDI-5zP77-o3/view?usp=sharing";
            const htmlContent = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: #1F2937; padding: 20px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0;">Nature Farming</h1>
                    </div>
                    <div style="padding: 30px; background-color: #ffffff;">
                        <h2 style="color: #333333; margin-top: 0;">Password Reset</h2>
                        <p style="color: #555555; line-height: 1.6;">Hello ${employee.fullName},</p>
                        <p style="color: #555555; line-height: 1.6;">Your password has been reset successfully. Here are your new login credentials:</p>
                        <div style="background-color: #f8f9fa; border-left: 4px solid #4CAF50; padding: 15px; margin: 20px 0;">
                            <p style="margin: 5px 0;"><strong>User ID:</strong> ${employee.userId}</p>
                            <p style="margin: 5px 0;"><strong>New Password:</strong> ${plainPassword}</p>
                            <p style="margin: 5px 0;"><strong>Role:</strong> ${employee.role}</p>
                            <p style="margin: 5px 0;"><strong>Branch:</strong> ${employee.branchName || employee.assignedArea || 'N/A'}</p>
                        </div>
                        <p style="color: #555555; line-height: 1.6;">Please click the button below to access the application:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${startLink}" style="background-color: #4CAF50; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Login Now</a>
                        </div>
                        <p style="color: #888888; font-size: 12px; line-height: 1.6;">For security reasons, please change your password after logging in.</p>
                    </div>
                    <div style="background-color: #f1f1f1; padding: 15px; text-align: center;">
                        <p style="color: #888888; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} Nature Farming. All rights reserved.</p>
                    </div>
                </div>
            `;

            const mailOptions = {
                from: process.env.EMAIL_USER || 'abisivan1827@gmail.com',
                to: employee.email,
                subject: 'Password Reset - Nature Farming',
                html: htmlContent
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) console.log('Error sending email:', error);
                else console.log('Email sent: ' + info.response);
            });
        }

        res.status(200).json({
            success: true,
            message: 'Password reset successful. New password sent to email.',
            employeeId: employee.userId,
            newPassword: plainPassword
        });

    } catch (err) {
        console.error('Error resetting password:', err);
        res.status(500).json({ message: err.message });
    }
});

// PATCH toggle employee status
router.patch('/:id/status', async (req, res) => {
    try {
        const models = [ITSector, BranchManager, FieldVisitor, Manager, Analyzer, Employee];
        let employee = null;
        let usedModel = null;

        // Find the employee across all collections
        for (const model of models) {
            employee = await model.findOne({ userId: req.params.id });
            if (employee) {
                usedModel = model;
                break;
            }
        }

        // Fallback to _id search
        if (!employee) {
            for (const model of models) {
                if (mongoose.Types.ObjectId.isValid(req.params.id)) {
                    employee = await model.findById(req.params.id);
                    if (employee) {
                        usedModel = model;
                        break;
                    }
                }
            }
        }

        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        const newStatus = employee.status === 'active' ? 'inactive' : 'active';

        // Update ALL collections for this userId
        const updatePromises = models.map(async (model) => {
            const matches = await model.find({ userId: employee.userId });
            for (const doc of matches) {
                const update = { $set: { status: newStatus } };

                if (newStatus === 'inactive') {
                    // Only backup if it's a real password (not already deactivated)
                    if (doc.password && !doc.password.startsWith('DEACTIVATED_')) {
                        update.$set.backupPassword = doc.password;
                        update.$set.password = `DEACTIVATED_${doc.userId}`;
                    }
                } else {
                    // Restore if backup exists
                    if (doc.backupPassword) {
                        update.$set.password = doc.backupPassword;
                        update.$unset = { backupPassword: "" };
                    }
                }

                await model.updateOne({ _id: doc._id }, update);
            }
        });

        await Promise.all(updatePromises);

        res.json({
            success: true,
            status: newStatus,
            userId: employee.userId
        });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
