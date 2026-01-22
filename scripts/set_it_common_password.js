// Script to set a common password for all IT Sector users
// Run this script to set the initial common password

require('dotenv').config();
const mongoose = require('mongoose');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://cst23071_db_user:vgquPlo0tLETMjvK@cluster0.s8fljgu.mongodb.net/nf-farming?retryWrites=true&w=majority';

const ITSector = require('../models/ITSector');

// Common password for all IT sector users
const COMMON_PASSWORD = 'IT@2026';

const setCommonPassword = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get all IT sector users
        const itUsers = await ITSector.find();
        console.log(`\n📊 Found ${itUsers.length} IT sector users`);

        if (itUsers.length === 0) {
            console.log('ℹ️  No IT sector users found');
            process.exit(0);
        }

        let updatedCount = 0;
        const errors = [];

        for (const user of itUsers) {
            try {
                user.password = COMMON_PASSWORD;
                user.hasChangedPassword = false;
                await user.save();
                updatedCount++;
                console.log(`✅ Set common password for ${user.userId} (${user.fullName})`);
            } catch (err) {
                console.error(`❌ Error updating ${user.userId}:`, err.message);
                errors.push({
                    userId: user.userId,
                    error: err.message
                });
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log('📋 PASSWORD UPDATE SUMMARY');
        console.log('='.repeat(50));
        console.log(`✅ Updated: ${updatedCount}`);
        console.log(`❌ Errors: ${errors.length}`);
        console.log(`🔑 Common Password: ${COMMON_PASSWORD}`);

        if (errors.length > 0) {
            console.log('\n❌ ERRORS:');
            errors.forEach(err => {
                console.log(`  - ${err.userId}: ${err.error}`);
            });
        }

        console.log('\n✅ Password update completed successfully!');
        console.log('ℹ️  All IT sector users can now login with password:', COMMON_PASSWORD);
        process.exit(0);

    } catch (error) {
        console.error('❌ Password update failed:', error);
        process.exit(1);
    }
};

// Run script
setCommonPassword();
