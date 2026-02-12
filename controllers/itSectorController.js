const ITSector = require('../models/ITSector');

// @desc    Import IT Sector employees from Excel data
// @route   POST /api/it-sector/import
// @access  Private/Manager
const importITSector = async (req, res) => {
    try {
        const { rows } = req.body;
        const BranchManager = require('../models/BranchManager');
        const FieldVisitor = require('../models/FieldVisitor');

        if (!rows || !Array.isArray(rows)) {
            return res.status(400).json({ success: false, message: 'Invalid data format. Expected an array of rows.' });
        }

        let insertedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;
        const errors = [];
        const skippedDetails = [];

        const normalizeKey = (obj, keys) => {
            const objKeys = Object.keys(obj);
            for (const key of keys) {
                const found = objKeys.find(k => k.toLowerCase().trim() === key.toLowerCase().trim());
                if (found) return obj[found];
            }
            return undefined;
        };

        for (const [index, row] of rows.entries()) {
            try {
                // Map Common Headers
                const fullName = normalizeKey(row, ['Full name', 'fullName', 'Name', 'Full Name']);
                const userId = normalizeKey(row, ['Developer ID', 'developerId', 'ID', 'Dev ID', 'UserID', 'User ID']);
                const email = normalizeKey(row, ['Email', 'email', 'E-mail']);
                const rawPhone = normalizeKey(row, ['phone number', 'phoneNumber', 'phone', 'Mobile', 'Phone Number']);
                const roleInput = normalizeKey(row, ['Role', 'role', 'Position']);

                // Specific fields
                const address = normalizeKey(row, ['Address', 'address', 'Postal Address']);
                const rawBank = normalizeKey(row, ['bank account (peoples bank)', 'bankAccount', 'Bank Account', 'Account No']);
                const branchName = normalizeKey(row, ['Branch', 'branch', 'Branch Name', 'Area']);
                // For FV, Area is essentially their branch or location.

                const phoneNumber = rawPhone ? String(rawPhone) : '';
                const bankAccount = rawBank ? String(rawBank) : '';

                // Determine target role (normalize to 'manager', 'field_visitor', 'it_sector')
                let targetRole = 'it_sector';
                if (roleInput) {
                    const r = roleInput.toLowerCase().trim();
                    if (r.includes('manager')) targetRole = 'manager';
                    else if (r.includes('visitor') || r.includes('field')) targetRole = 'field_visitor';
                    else if (r.includes('it') || r.includes('developer')) targetRole = 'it_sector';
                }

                if (!fullName || !userId || !phoneNumber) {
                    skippedCount++;
                    skippedDetails.push({
                        rowIndex: index + 2,
                        reason: 'Missing required fields (Name, ID, or Phone)',
                        data: { fullName, userId, phoneNumber }
                    });
                    continue;
                }

                if (targetRole === 'manager') {
                    // === MANAGER IMPORT ===
                    let manager = await BranchManager.findOne({ userId });
                    if (manager) {
                        manager.fullName = fullName;
                        manager.phone = phoneNumber;
                        manager.email = email || manager.email;
                        manager.branchName = branchName || manager.branchName || 'Head Office';
                        await manager.save();
                        updatedCount++;
                    } else {
                        await BranchManager.create({
                            fullName,
                            userId,
                            email: email || `${userId.toLowerCase()}@nf.com`,
                            phone: phoneNumber,
                            password: '123', // Default
                            role: 'branch_manager',
                            branchName: branchName || 'Head Office',
                            branchId: `branch-${userId}`
                        });
                        insertedCount++;
                    }

                } else if (targetRole === 'field_visitor') {
                    // === FIELD VISITOR IMPORT ===
                    let fv = await FieldVisitor.findOne({ userId });
                    if (fv) {
                        fv.name = fullName;
                        fv.fullName = fullName;
                        fv.phone = phoneNumber;
                        fv.area = branchName || fv.area || 'Default Area';
                        if (email) fv.email = email;
                        if (bankAccount) {
                            if (!fv.bankDetails) fv.bankDetails = {};
                            fv.bankDetails.accountNumber = bankAccount;
                        }
                        if (address) fv.postalAddress = address;
                        await fv.save();
                        updatedCount++;
                    } else {
                        await FieldVisitor.create({
                            name: fullName,
                            fullName: fullName,
                            userId,
                            phone: phoneNumber,
                            email: email || undefined,
                            password: '123',
                            area: branchName || 'Default Area',
                            branchId: `branch-${userId}`, // Placeholder 
                            bankDetails: { accountNumber: bankAccount },
                            postalAddress: address
                        });
                        insertedCount++;
                    }

                } else {
                    // === IT SECTOR IMPORT (Default) ===
                    const existing = await ITSector.findOne({ userId });
                    if (existing) {
                        existing.fullName = fullName;
                        existing.email = email ? email.toLowerCase().trim() : existing.email;
                        existing.phone = phoneNumber;
                        existing.address = address || existing.address;
                        existing.bankAccount = bankAccount || existing.bankAccount;
                        await existing.save();
                        updatedCount++;
                    } else {
                        await ITSector.create({
                            fullName,
                            userId,
                            email: email ? email.toLowerCase().trim() : `${userId.toLowerCase()}@nf-farming.com`,
                            phone: phoneNumber,
                            address: address || '',
                            bankAccount: bankAccount || '',
                            password: '1234',
                            role: 'it_sector',
                            status: 'active',
                            branchName: 'Head Office',
                            branchId: 'HO-001'
                        });
                        insertedCount++;
                    }
                }

            } catch (err) {
                console.error('Error importing row:', err);
                skippedCount++;
                errors.push({ row, error: err.message });
            }
        }

        res.status(200).json({
            success: true,
            message: 'Import completed',
            data: {
                insertedCount,
                updatedCount,
                skippedCount,
                skippedDetails,
                errorCount: errors.length,
                errors: errors.length > 0 ? errors : undefined
            }
        });
    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ success: false, message: 'Import failed', error: error.message });
    }
};

// @desc    Set common password for all IT Sector users
// @route   POST /api/it-sector/set-common-password
// @access  Private/Admin
const setCommonPassword = async (req, res) => {
    try {
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a password'
            });
        }

        // Get all IT sector users
        const itUsers = await ITSector.find();

        if (itUsers.length === 0) {
            return res.json({
                success: true,
                message: 'No IT sector users found',
                updated: 0
            });
        }

        let updatedCount = 0;

        for (const user of itUsers) {
            try {
                user.password = password;
                user.hasChangedPassword = false;
                await user.save();
                updatedCount++;
            } catch (err) {
                console.error(`Error updating password for ${user.userId}:`, err);
            }
        }

        res.json({
            success: true,
            message: `Common password set for ${updatedCount} IT sector users`,
            updated: updatedCount,
            total: itUsers.length
        });

    } catch (error) {
        console.error('Set Common Password Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to set common password',
            error: error.message
        });
    }
};

// @desc    Get IT sector users who haven't changed password
// @route   GET /api/it-sector/unchanged-passwords
// @access  Private/Admin
const getUnchangedPasswords = async (req, res) => {
    try {
        const users = await ITSector.find({ hasChangedPassword: false })
            .select('-password');

        res.json({
            success: true,
            count: users.length,
            data: users
        });

    } catch (error) {
        console.error('Get Unchanged Passwords Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users',
            error: error.message
        });
    }
};

module.exports = { importITSector, setCommonPassword, getUnchangedPasswords };

