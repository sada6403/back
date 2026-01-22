const mongoose = require('mongoose');
const ITSector = require('../models/ITSector');
const bcrypt = require('bcryptjs');

require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://cst23071_db_user:vgquPlo0tLETMjvK@cluster0.s8fljgu.mongodb.net/nf-farming?retryWrites=true&w=majority';

const fixUser = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // 1. Find and DELETE the dummy user (kee001@example.com)
        const dummyUser = await ITSector.findOne({ email: 'kee001@example.com' });
        if (dummyUser) {
            console.log(`🗑️ Deleting dummy user: ${dummyUser.userId} (${dummyUser.email})`);
            await ITSector.deleteOne({ _id: dummyUser._id });
            console.log('✅ Dummy user deleted.');
        } else {
            console.log('ℹ️ Dummy user not found (good).');
        }

        // 2. Find the REAL user ("Kee 001")
        // Note: The screenshot showed "Kee 001" with a space.
        // We will try finding by ID or regex if exact match fails, but regex is safer.
        const realUser = await ITSector.findOne({ userId: /Kee\s*001/i, email: /nfplantation/i });

        if (realUser) {
            console.log(`\nfound Real User:`);
            console.log(`   ID: ${realUser._id}`);
            console.log(`   Old UserID: '${realUser.userId}'`);
            console.log(`   Name: ${realUser.fullName}`);

            // Update to standard format
            realUser.userId = 'Kee001'; // Remove space
            realUser.password = 'IT@2026'; // Reset password
            realUser.hasChangedPassword = false;

            await realUser.save();
            console.log(`\n✅ Updated Real User:`);
            console.log(`   New UserID: '${realUser.userId}'`);
            console.log(`   Password: IT@2026`);
        } else {
            console.log('❌ CRITICAL: Could not find real user "Kee 001" / "nfplantation@gmail.com"');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

fixUser();
