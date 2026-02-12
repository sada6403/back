require('dotenv').config();
const mongoose = require('mongoose');
const BranchManager = require('./models/BranchManager');
const FieldVisitor = require('./models/FieldVisitor');
const Member = require('./models/Member');

async function checkEmails() {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        console.log('DB Connected');

        const managerCount = await BranchManager.countDocuments({ email: { $exists: true, $ne: '' } });
        const allManagers = await BranchManager.countDocuments({});
        console.log(`Managers with Email: ${managerCount} / ${allManagers}`);
        if (managerCount < allManagers) {
            const sample = await BranchManager.findOne({});
            console.log('Sample Manager:', sample);
        }

        const fvCount = await FieldVisitor.countDocuments({ email: { $exists: true, $ne: '' } });
        const allFVs = await FieldVisitor.countDocuments({});
        console.log(`Field Visitors with Email: ${fvCount} / ${allFVs}`);
        if (fvCount < allFVs) {
            const sample = await FieldVisitor.findOne({});
            console.log('Sample FV:', sample);
        }

        const memberCount = await Member.countDocuments({ email: { $exists: true, $ne: '' } });
        const allMembers = await Member.countDocuments({});
        console.log(`Members with Email: ${memberCount} / ${allMembers}`);
        if (memberCount < allMembers) {
            const sample = await Member.findOne({});
            console.log('Sample Member:', sample);
        }

    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
    }
}

checkEmails();
