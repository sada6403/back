// Refactored to use ITSector model as the "Admin" entity
const Admin = require('../models/ITSector'); // Mapping Admin to ITSector
const BranchManager = require('../models/BranchManager');

// @desc    Get all admins (IT Sector users)
// @route   GET /api/admin
// @access  Private
const getAllAdmins = async (req, res) => {
    try {
        const admins = await Admin.find().select('-password');

        res.status(200).json({
            success: true,
            count: admins.length,
            data: admins
        });
    } catch (error) {
        console.error('Get Admins Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch admins',
            error: error.message
        });
    }
};

// @desc    Create new admin
// @route   POST /api/admin
// @access  Private/IT Sector
const createAdmin = async (req, res) => {
    try {
        const { fullName, email, password, userId, phone, branchName, branchId } = req.body;

        if (!fullName || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide fullName, email, and password'
            });
        }

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({
            $or: [{ email }, { userId }]
        });

        if (existingAdmin) {
            return res.status(400).json({
                success: false,
                message: 'Admin with this email or userId already exists'
            });
        }

        const newAdmin = new Admin({
            fullName,
            email,
            password,
            userId: userId || 'IT' + Date.now().toString().slice(-6), // IT prefix
            phone: phone || '',
            branchName: branchName || 'Head Office',
            branchId: branchId || 'HO-001',
            role: 'it_sector', // Persist as it_sector but treated as admin
            status: 'active',
            hasChangedPassword: false // Default for new admins
        });

        const savedAdmin = await newAdmin.save();

        res.status(201).json({
            success: true,
            message: 'Admin created successfully',
            data: {
                id: savedAdmin._id,
                fullName: savedAdmin.fullName,
                email: savedAdmin.email,
                userId: savedAdmin.userId,
                role: savedAdmin.role
            }
        });

    } catch (error) {
        console.error('Create Admin Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create admin',
            error: error.message
        });
    }
};

// @desc    Update admin
// @route   PUT /api/admin/:id
// @access  Private/IT Sector
const updateAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Don't allow password updates through this endpoint
        delete updates.password;

        const admin = await Admin.findByIdAndUpdate(
            id,
            updates,
            { new: true, runValidators: true }
        ).select('-password');

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        res.json({
            success: true,
            message: 'Admin updated successfully',
            data: admin
        });

    } catch (error) {
        console.error('Update Admin Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update admin',
            error: error.message
        });
    }
};

// @desc    Delete admin
// @route   DELETE /api/admin/:id
// @access  Private/IT Sector
const deleteAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        const admin = await Admin.findByIdAndDelete(id);

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        res.json({
            success: true,
            message: 'Admin deleted successfully'
        });

    } catch (error) {
        console.error('Delete Admin Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete admin',
            error: error.message
        });
    }
};

// @desc    Migrate managers to admin collection
// @route   POST /api/admin/migrate
// @access  Private/IT Sector
const migrateManagersToAdmin = async (req, res) => {
    try {
        // Get all managers
        const managers = await BranchManager.find();

        if (managers.length === 0) {
            return res.json({
                success: true,
                message: 'No managers to migrate',
                migrated: 0
            });
        }

        let migratedCount = 0;
        const errors = [];

        for (const manager of managers) {
            try {
                // Check if already migrated
                const existingAdmin = await Admin.findOne({
                    $or: [
                        { email: manager.email },
                        { userId: manager.userId }
                    ]
                });

                if (existingAdmin) {
                    console.log(`Admin already exists for manager: ${manager.userId}`);
                    continue;
                }

                // Create admin from manager data
                const admin = new Admin({
                    fullName: manager.fullName || manager.name,
                    email: manager.email,
                    password: manager.password, // Already hashed
                    userId: manager.userId,
                    phone: manager.phone || '',
                    branchName: manager.branchName || 'Head Office',
                    branchId: manager.branchId || 'HO-001',
                    role: 'admin',
                    status: manager.status || 'active',
                    // Copy additional fields if they exist
                    address: manager.address || '',
                    nic: manager.nic || '',
                    civilStatus: manager.civilStatus || '',
                    postalAddress: manager.postalAddress || '',
                    permanentAddress: manager.permanentAddress || '',
                    education: manager.education || '',
                    bankName: manager.bankName || '',
                    bankBranch: manager.bankBranch || '',
                    accountNo: manager.accountNo || '',
                    accountHolder: manager.accountHolder || ''
                });

                // Save without re-hashing password
                await admin.save({ validateBeforeSave: true });

                // Delete manager after successful migration
                await BranchManager.findByIdAndDelete(manager._id);

                migratedCount++;
                console.log(`Migrated manager ${manager.userId} to admin`);

            } catch (err) {
                console.error(`Error migrating manager ${manager.userId}:`, err);
                errors.push({
                    userId: manager.userId,
                    error: err.message
                });
            }
        }

        res.json({
            success: true,
            message: `Migration completed. ${migratedCount} managers migrated to admin.`,
            migrated: migratedCount,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('Migration Error:', error);
        res.status(500).json({
            success: false,
            message: 'Migration failed',
            error: error.message
        });
    }
};

module.exports = {
    getAllAdmins,
    createAdmin,
    updateAdmin,
    deleteAdmin,
    migrateManagersToAdmin
};
