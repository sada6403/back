const mongoose = require('mongoose');
const ITSector = require('../models/ITSector');
const bcrypt = require('bcryptjs');

require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://cst23071_db_user:vgquPlo0tLETMjvK@cluster0.s8fljgu.mongodb.net/nf-farming?retryWrites=true&w=majority';

const createUser = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const userId = 'Kee001';
        const existing = await ITSector.findOne({ userId });

        if (existing) {
            console.log(`⚠️ User ${userId} already exists.`);
            // Update password just in case
            existing.password = 'IT@2026'; // Will be hashed by pre-save
            await existing.save();
            console.log(`✅ Updated password for ${userId} to IT@2026`);
        } else {
            console.log(`ℹ️ Creating new user ${userId}...`);
            const newUser = new ITSector({
                userId: userId,
                fullName: 'Kee Developer',
                email: 'kee001@example.com',
                password: 'IT@2026',
                phone: '0000000000',
                role: 'it_sector',
                status: 'active'
            });
            await newUser.save();
            console.log(`✅ User ${userId} created successfully!`);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

createUser();
