const mongoose = require('mongoose');
const ITSector = require('../models/ITSector');
const bcrypt = require('bcryptjs');

require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://cst23071_db_user:vgquPlo0tLETMjvK@cluster0.s8fljgu.mongodb.net/nf-farming?retryWrites=true&w=majority';

const debugLogin = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to DB');

        const targetId = 'Kee001';
        console.log(`\n🔍 Searching specifically for: "${targetId}"`);

        // Exact match
        const exact = await ITSector.findOne({ userId: targetId });
        if (exact) {
            console.log('✅ Found EXACT match for Kee001');
            console.log('   Role:', exact.role);
            const match = await bcrypt.compare('IT@2026', exact.password);
            console.log('   Password OK?', match);
        } else {
            console.log('❌ NO exact match for Kee001');
        }

        // Case insensitive
        const caseInsensitive = await ITSector.findOne({ userId: { $regex: new RegExp(`^${targetId}$`, 'i') } });
        if (caseInsensitive && !exact) {
            console.log(`⚠️ Found CASE-INSENSITIVE match: ${caseInsensitive.userId}`);
        }

        console.log('\n📋 Current Users in ITSector:');
        const users = await ITSector.find({}, 'userId fullName email role');
        users.forEach(u => console.log(`   [${u.userId}] ${u.fullName} (${u.role})`));

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

debugLogin();
