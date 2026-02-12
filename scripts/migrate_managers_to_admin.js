// Migration script to move all managers from Manager collection to Admin collection
// Run this script once to perform the migration

require('dotenv').config();
const mongoose = require('mongoose');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://cst23071_db_user:vgquPlo0tLETMjvK@cluster0.s8fljgu.mongodb.net/nf-farming?retryWrites=true&w=majority';

const BranchManager = require('../models/BranchManager');
const Admin = require('../models/Admin');

const migrateManagersToAdmin = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get all managers
        const managers = await BranchManager.find();
        console.log(`\n📊 Found ${managers.length} managers to migrate`);

        if (managers.length === 0) {
            console.log('ℹ️  No managers to migrate');
            process.exit(0);
        }

        let migratedCount = 0;
        let skippedCount = 0;
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
                    console.log(`⏭️  Skipping ${manager.userId} - already exists as admin`);
                    skippedCount++;
                    continue;
                }

                // Create admin from manager data
                const adminData = {
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
                };

                // Create admin without triggering password hashing (already hashed)
                const admin = new Admin(adminData);

                // Bypass password hashing by directly saving
                await Admin.collection.insertOne(admin.toObject());

                // Delete manager after successful migration
                await BranchManager.findByIdAndDelete(manager._id);

                migratedCount++;
                console.log(`✅ Migrated ${manager.userId} (${manager.fullName}) to admin`);

            } catch (err) {
                console.error(`❌ Error migrating ${manager.userId}:`, err.message);
                errors.push({
                    userId: manager.userId,
                    error: err.message
                });
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log('📋 MIGRATION SUMMARY');
        console.log('='.repeat(50));
        console.log(`✅ Migrated: ${migratedCount}`);
        console.log(`⏭️  Skipped: ${skippedCount}`);
        console.log(`❌ Errors: ${errors.length}`);

        if (errors.length > 0) {
            console.log('\n❌ ERRORS:');
            errors.forEach(err => {
                console.log(`  - ${err.userId}: ${err.error}`);
            });
        }

        console.log('\n✅ Migration completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
};

// Run migration
migrateManagersToAdmin();
