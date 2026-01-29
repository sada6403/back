const mongoose = require('mongoose');
require('dotenv').config();

const FieldVisitor = require('./models/FieldVisitor');
const Manager = require('./models/Manager');
const BranchManager = require('./models/BranchManager');
const ITSector = require('./models/ITSector');
const Employee = require('./models/Employee');

async function checkUser() {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        console.log('DB Connected');

        const models = { FieldVisitor, Manager, BranchManager, ITSector, Employee };
        const userId = 'FV-JA-003';

        for (const [name, model] of Object.entries(models)) {
            const user = await model.findOne({ userId });
            if (user) {
                console.log(`User found in ${name}:`, JSON.stringify(user, null, 2));
                return;
            }
        }

        console.log('User not found in any standard collection.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkUser();
