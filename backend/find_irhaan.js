const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const ITSector = require('./models/ITSector');
const BranchManager = require('./models/BranchManager');
const FieldVisitor = require('./models/FieldVisitor');
const Manager = require('./models/Manager');
const Employee = require('./models/Employee');

async function findIrhaanAndCheckDev() {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const searchName = /irhaan/i;
        const models = {
            ITSector,
            BranchManager,
            FieldVisitor,
            Manager,
            Employee
        };

        console.log('\n--- Searching for "irhaan" ---');
        for (const [name, model] of Object.entries(models)) {
            if (!model) continue;
            const users = await model.find({ fullName: searchName });
            if (users.length > 0) {
                users.forEach(u => {
                    console.log(`Found in ${name}: ${u.fullName} (ID: ${u.userId}, Email: ${u.email})`);
                });
            }
        }

        console.log('\n--- Checking DEV-IT-1108 ---');
        const devUser = await ITSector.findOne({ userId: 'DEV-IT-1108' });
        if (devUser) {
            console.log(`User: ${devUser.fullName}`);
            const is123456 = await bcrypt.compare('123456', devUser.password);
            console.log(`Is password '123456'? ${is123456}`);

            // Also check the passwords I set previously
            const isPermanent = await bcrypt.compare('Permanent123!', devUser.password);
            const isDirect = await bcrypt.compare('DirectUpdate123!', devUser.password);
            console.log(`Is password 'Permanent123!'? ${isPermanent}`);
            console.log(`Is password 'DirectUpdate123!'? ${isDirect}`);
        } else {
            console.log('DEV-IT-1108 not found in ITSector');
        }

        process.exit(0);
    } catch (e) {
        console.error('❌ Error:', e.message);
        process.exit(1);
    }
}

findIrhaanAndCheckDev();
