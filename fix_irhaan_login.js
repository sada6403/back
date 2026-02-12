const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const ITSector = require('./models/ITSector');
const BranchManager = require('./models/BranchManager');
const FieldVisitor = require('./models/FieldVisitor');

async function fixPassword() {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const testUserId = 'DEV-IT-1108';
        const newPass = '123456';

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPass, salt);

        const updated = await ITSector.findOneAndUpdate(
            { userId: testUserId },
            { $set: { password: hashedPassword, hasChangedPassword: true } },
            { new: true }
        );

        if (updated) {
            console.log(`✅ Updated ${testUserId} (${updated.fullName}) password to ${newPass}`);
        } else {
            console.log(`❌ User ${testUserId} not found`);
        }

        // Search for Irhaan
        const irhaan = await ITSector.findOne({ fullName: /irhaan/i });
        if (irhaan) {
            console.log(`Found Irhaan: ID is ${irhaan.userId}`);
        }

        process.exit(0);
    } catch (e) {
        console.error('❌ Error:', e.message);
        process.exit(1);
    }
}

fixPassword();
