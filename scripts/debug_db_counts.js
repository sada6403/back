const mongoose = require('mongoose');
require('dotenv').config();

const BranchManager = require('../models/BranchManager');
const Manager = require('../models/Manager');
const FieldVisitor = require('../models/FieldVisitor');
const Employee = require('../models/Employee');

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const bmCount = await BranchManager.countDocuments();
        const mCount = await Manager.countDocuments();
        const fvCount = await FieldVisitor.countDocuments();
        const eCount = await Employee.countDocuments();

        // Check for dynamic collections if any
        const collections = await mongoose.connection.db.listCollections().toArray();

        console.log('--- Counts ---');
        console.log('BranchManagers:', bmCount);
        console.log('Managers:', mCount);
        console.log('FieldVisitors:', fvCount);
        console.log('Employees:', eCount);

        console.log('--- All Collections ---');
        for (const c of collections) {
            const count = await mongoose.connection.db.collection(c.name).countDocuments();
            console.log(`${c.name}: ${count}`);
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
