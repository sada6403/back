require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const BranchManager = require('../models/BranchManager');
const FieldVisitor = require('../models/FieldVisitor');
const Member = require('../models/Member');
const User = require('../models/User');

// Note: If you have a Branch model, uncomment and use it
// const Branch = require('../models/Branch');

async function rebrand() {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        if (!uri) throw new Error('MONGO_URI is undefined in .env');
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        console.log('Starting Karachchi Rebranding (KA -> KC)...');

        // 1. Rebrand Branch Managers
        // Karachchi manager is BM-KA-001 in BR-KA-001
        // Kandavalai manager is BM-KA-002 in BR-KA-002 (Wait, is Kandavalai also rebranding? 
        // User said "rebranding Karachchi branch from KA to KC". 
        // Kandavalai is BR-KA-002. Rebranding often applies to the branch code itself if it's shared.
        // However, if KA specifically stands for Karachchi, then only BR-KA-001 might change.
        // BUT the user said "KA branch codes to KC". 
        // Let's check if BR-KA-002 should stay KA or change to KC.
        // Usually, rebranding the prefix KA -> KC means ALL KA codes change.

        const managers = await BranchManager.find({ userId: /^BM-KA-/ });
        console.log(`Found ${managers.length} managers to rebrand.`);
        for (let mgr of managers) {
            const oldId = mgr.userId;
            const newId = oldId.replace('BM-KA-', 'BM-KC-');
            const oldBranch = mgr.branchId;
            const newBranch = oldBranch.replace('BR-KA-', 'BR-KC-');

            console.log(`Rebranding Manager: ${oldId} -> ${newId}, Branch: ${oldBranch} -> ${newBranch}`);

            mgr.userId = newId;
            mgr.branchId = newBranch;
            await mgr.save();

            // Update corresponding User record
            const user = await User.findOne({ userId: oldId });
            if (user) {
                user.userId = newId;
                user.branchId = newBranch;
                user.email = user.email.replace('bm-ka-', 'bm-kc-').replace('br-ka-', 'br-kc-');
                await user.save();
                console.log(`  -> User record updated.`);
            }
        }

        // 2. Rebrand Field Visitors
        const fvs = await FieldVisitor.find({ userId: /^FV-KA-/ });
        console.log(`Found ${fvs.length} Field Visitors to rebrand.`);
        for (let fv of fvs) {
            const oldId = fv.userId;
            const newId = oldId.replace('FV-KA-', 'FV-KC-');
            const oldBranch = fv.branchId;
            const newBranch = oldBranch.replace('BR-KA-', 'BR-KC-');

            console.log(`Rebranding Field Visitor: ${oldId} -> ${newId}, Branch: ${oldBranch} -> ${newBranch}`);

            fv.userId = newId;
            fv.branchId = newBranch;
            // Update managerId link if it points to BM-KA?
            // Actually managerId is often an ObjectId, so it's fine unless it's a string.
            // Let's check for any KA strings in managerId if it's a string.
            if (typeof fv.managerId === 'string' && fv.managerId.startsWith('BM-KA-')) {
                fv.managerId = fv.managerId.replace('BM-KA-', 'BM-KC-');
            }

            await fv.save();

            // Update corresponding User record
            const user = await User.findOne({ userId: oldId });
            if (user) {
                user.userId = newId;
                user.branchId = newBranch;
                user.email = user.email.replace('fv-ka-', 'fv-kc-').replace('br-ka-', 'br-kc-');
                await user.save();
                console.log(`  -> User record updated.`);
            }
        }

        // 3. Rebrand Members
        const members = await Member.find({ memberCode: /^MEM-KA-/ });
        console.log(`Found ${members.length} Members to rebrand.`);
        for (let mem of members) {
            const oldId = mem.memberCode;
            const newId = oldId.replace('MEM-KA-', 'MEM-KC-');
            const oldBranch = mem.branchId;
            const newBranch = oldBranch.replace('BR-KA-', 'BR-KC-');

            console.log(`Rebranding Member: ${oldId} -> ${newId}, Branch: ${oldBranch} -> ${newBranch}`);

            mem.memberCode = newId;
            mem.branchId = newBranch;

            if (typeof mem.fieldVisitorId === 'string' && mem.fieldVisitorId.startsWith('FV-KA-')) {
                mem.fieldVisitorId = mem.fieldVisitorId.replace('FV-KA-', 'FV-KC-');
            }

            await mem.save();
        }

        console.log('Rebranding completed successfully.');

    } catch (err) {
        console.error('Rebranding failed:', err);
    } finally {
        await mongoose.disconnect();
    }
}

rebrand();
