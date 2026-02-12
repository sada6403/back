const mongoose = require('mongoose');
const FieldVisitor = require('../models/FieldVisitor');
const BranchManager = require('../models/BranchManager');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

async function listAll() {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const fvs = await FieldVisitor.find({}).lean();
        console.log(`Found ${fvs.length} Field Visitors`);

        for (let fv of fvs) {
            const manager = await BranchManager.findById(fv.managerId).lean();
            console.log(`${fv.userId} | ${fv.fullName} | Branch: ${fv.branchId} | Manager: ${manager ? manager.name : 'N/A'} | Phone: ${fv.phone} | NIC: ${fv.nic}`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

listAll();
