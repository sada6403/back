require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const BranchManager = require('../models/BranchManager');
const FieldVisitor = require('../models/FieldVisitor');
const Member = require('../models/Member');
const User = require('../models/User');

async function revertKandavalai() {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        if (!uri) throw new Error('MONGO_URI is undefined in .env');
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        console.log('Reverting Kandawalai (KC -> KA) specifically for branch BR-KC-002...');

        // 1. Revert Branch Managers for Kandawalai (usually only BM-KC-002)
        const managers = await BranchManager.find({ branchId: 'BR-KC-002' });
        console.log(`Found ${managers.length} managers to revert.`);
        for (let mgr of managers) {
            const oldId = mgr.userId;
            const newId = oldId.replace('BM-KC-', 'BM-KA-');
            const oldBranch = mgr.branchId;
            const newBranch = 'BR-KA-002'; // Explicitly back to KA

            console.log(`Reverting Manager: ${oldId} -> ${newId}, Branch: ${oldBranch} -> ${newBranch}`);

            mgr.userId = newId;
            mgr.branchId = newBranch;
            await mgr.save();

            // Update corresponding User record
            const user = await User.findOne({ userId: oldId });
            if (user) {
                user.userId = newId;
                user.branchId = newBranch;
                user.email = user.email.replace('bm-kc-', 'bm-ka-').replace('br-kc-', 'br-ka-');
                await user.save();
                console.log(`  -> User record updated.`);
            }
        }

        // 2. Revert Field Visitors for Kandawalai
        const fvs = await FieldVisitor.find({ branchId: 'BR-KC-002' });
        console.log(`Found ${fvs.length} Field Visitors to revert.`);
        for (let fv of fvs) {
            const oldId = fv.userId;
            const newId = oldId.replace('FV-KC-', 'FV-KA-');
            const oldBranch = fv.branchId;
            const newBranch = 'BR-KA-002';

            console.log(`Reverting Field Visitor: ${oldId} -> ${newId}, Branch: ${oldBranch} -> ${newBranch}`);

            fv.userId = newId;
            fv.branchId = newBranch;
            if (typeof fv.managerId === 'string' && fv.managerId.startsWith('BM-KC-')) {
                fv.managerId = fv.managerId.replace('BM-KC-', 'BM-KA-');
            }
            await fv.save();

            // Update corresponding User record
            const user = await User.findOne({ userId: oldId });
            if (user) {
                user.userId = newId;
                user.branchId = newBranch;
                user.email = user.email.replace('fv-kc-', 'fv-ka-').replace('br-kc-', 'br-ka-');
                await user.save();
                console.log(`  -> User record updated.`);
            }
        }

        // 3. Revert Members for Kandawalai
        const members = await Member.find({ branchId: 'BR-KC-002' });
        console.log(`Found ${members.length} Members to revert.`);
        for (let mem of members) {
            const oldId = mem.memberCode;
            const newId = oldId ? oldId.replace('MEM-KC-', 'MEM-KA-') : oldId;
            const oldBranch = mem.branchId;
            const newBranch = 'BR-KA-002';

            if (oldId && oldId.startsWith('MEM-KC-')) {
                console.log(`Reverting Member: ${oldId} -> ${newId}, Branch: ${oldBranch} -> ${newBranch}`);
            } else {
                console.log(`Updating Member branch: ${oldBranch} -> ${newBranch} for ${oldId}`);
            }

            if (newId) mem.memberCode = newId;
            mem.branchId = newBranch;

            if (typeof mem.fieldVisitorId === 'string' && mem.fieldVisitorId.startsWith('FV-KC-')) {
                mem.fieldVisitorId = mem.fieldVisitorId.replace('FV-KC-', 'FV-KA-');
            }

            await mem.save();
        }

        console.log('Reversion for Kandawalai completed successfully.');

    } catch (err) {
        console.error('Reversion failed:', err);
    } finally {
        await mongoose.disconnect();
    }
}

revertKandavalai();
