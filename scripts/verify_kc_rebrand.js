require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const FieldVisitor = require('../models/FieldVisitor');
const BranchManager = require('../models/BranchManager');
const Member = require('../models/Member');
const User = require('../models/User');

async function verify() {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        console.log('\n--- Rebranding Verification Results ---');

        // Check counts
        const kaManagers = await BranchManager.countDocuments({ userId: /^BM-KA-/ });
        const kaFVs = await FieldVisitor.countDocuments({ userId: /^FV-KA-/ });
        const kaMembers = await Member.countDocuments({ memberCode: /^MEM-KA-/ });

        const kcManagers = await BranchManager.countDocuments({ userId: /^BM-KC-/ });
        const kcFVs = await FieldVisitor.countDocuments({ userId: /^FV-KC-/ });
        const kcMembers = await Member.countDocuments({ memberCode: /^MEM-KC-/ });

        console.log(`Kandawalai (KA) - Managers: ${kaManagers}, FVs: ${kaFVs}, Members: ${kaMembers}`);
        console.log(`Karachchi (KC)  - Managers: ${kcManagers}, FVs: ${kcFVs}, Members: ${kcMembers}`);

        // Sample check for linkage
        if (kcFVs > 0) {
            const sampleFV = await FieldVisitor.findOne({ userId: /^FV-KC-/ });
            console.log(`\nSample FV Restoration Check:`);
            console.log(`  ID: ${sampleFV.userId}`);
            console.log(`  Name: ${sampleFV.fullName}`);
            console.log(`  Branch: ${sampleFV.branchId} (${sampleFV.branchName})`);

            if (sampleFV.managerId) {
                const manager = await BranchManager.findById(sampleFV.managerId);
                if (manager) {
                    console.log(`  Manager: ${manager.userId} (${manager.fullName})`);
                } else {
                    console.log(`  Manager: ID ${sampleFV.managerId} NOT FOUND in BranchManagers`);
                }
            } else {
                console.log(`  Manager: NOT LINKED`);
            }
        }

    } catch (err) {
        console.error('Verification failed:', err);
    } finally {
        await mongoose.disconnect();
    }
}

verify();
