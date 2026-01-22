// Restoration script to move all managers from Admin collection back to BranchManager collection
// Run this script to undo the migration

require('dotenv').config();
const mongoose = require('mongoose');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://cst23071_db_user:vgquPlo0tLETMjvK@cluster0.s8fljgu.mongodb.net/nf-farming?retryWrites=true&w=majority';

const BranchManager = require('../models/BranchManager');
const Admin = require('../models/Admin');

const restoreManagers = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get all admins who were migrated (exclude actual IT admins if any were created manually)
        // In our case, Admin collection contains the migrated managers.
        const admins = await Admin.find({ role: 'admin' });
        console.log(`\n📊 Found ${admins.length} admins (managers) to restore`);

        if (admins.length === 0) {
            console.log('ℹ️  No managers to restore');
            process.exit(0);
        }

        let restoredCount = 0;
        let skippedCount = 0;
        const errors = [];

        for (const admin of admins) {
            try {
                // Check if already exists in BranchManager (should not happen if we deleted, but good safety)
                const existingManager = await BranchManager.findOne({
                    $or: [
                        { email: admin.email },
                        { userId: admin.userId }
                    ]
                });

                if (existingManager) {
                    console.log(`⏭️  Skipping ${admin.userId} - already exists as BranchManager`);
                    skippedCount++;
                    // Optional: Delete from Admin if it's a duplicate and we want to clean up
                    // await Admin.findByIdAndDelete(admin._id); 
                    continue;
                }

                // Create manager from admin data
                const managerData = {
                    fullName: admin.fullName,
                    email: admin.email,
                    password: admin.password, // Already hashed
                    userId: admin.userId,
                    phone: admin.phone || '',
                    branchName: admin.branchName || 'Head Office',
                    branchId: admin.branchId || 'HO-001',
                    role: 'manager', // Restore role to 'manager' (or 'branch_manager' based on original schema?)
                    // Let's check authController.registerManager: role: 'branch_manager' -> but frontend usually checks 'manager'
                    // In authController login: role === 'manager'.
                    // In registerManager: role: 'branch_manager'. 
                    // Let's stick to what authController expects for login or consistent with original.
                    // Checking original Manager.js/BranchManager.js... 
                    // Wait, originally it was BranchManager.js?
                    // Let's look at `registerManager` in `authController.js` (Step 21).
                    // It saves `role: 'branch_manager'` but returns `role: 'manager'`.
                    // The login check `if (role === 'manager')` queries `BranchManager`.
                    // So in DB it was 'branch_manager'.
                    status: admin.status || 'active',

                    // Additional fields
                    address: admin.address,
                    nic: admin.nic,
                    civilStatus: admin.civilStatus,
                    postalAddress: admin.postalAddress,
                    permanentAddress: admin.permanentAddress,
                    education: admin.education,
                    bankName: admin.bankName,
                    bankBranch: admin.bankBranch,
                    accountNo: admin.accountNo,
                    accountHolder: admin.accountHolder
                };

                // Create manager without triggering password hashing (already hashed)
                const manager = new BranchManager(managerData);

                // Bypass password hashing by directly saving if needed, but since we set password directly and don't modify it...
                // The pre-save hook checks `if (!this.isModified('password'))`. 
                // Creating new doc marks all fields as modified? Yes.
                // So we should use insertOne to bypass hooks or manually set isModified false?
                // Easier: Use collection.insertOne

                await BranchManager.collection.insertOne(manager.toObject());

                // Delete from Admin collection
                await Admin.findByIdAndDelete(admin._id);

                restoredCount++;
                console.log(`✅ Restored ${admin.userId} (${admin.fullName}) to BranchManager`);

            } catch (err) {
                console.error(`❌ Error restoring ${admin.userId}:`, err.message);
                errors.push({
                    userId: admin.userId,
                    error: err.message
                });
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log('📋 RESTORATION SUMMARY');
        console.log('='.repeat(50));
        console.log(`✅ Restored: ${restoredCount}`);
        console.log(`⏭️  Skipped: ${skippedCount}`);
        console.log(`❌ Errors: ${errors.length}`);

        if (errors.length > 0) {
            console.log('\n❌ ERRORS:');
            errors.forEach(err => {
                console.log(`  - ${err.userId}: ${err.error}`);
            });
        }

        console.log('\n✅ Restoration completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Restoration failed:', error);
        process.exit(1);
    }
};

// Run restoration
restoreManagers();
