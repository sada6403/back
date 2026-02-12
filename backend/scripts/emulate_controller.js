const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config({ path: 'backend/.env' });

const Member = require('../models/Member');
const FieldVisitor = require('../models/FieldVisitor');
const BranchManager = require('../models/BranchManager');
const Transaction = require('../models/Transaction');

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('DB Connected'))
    .catch(err => console.error('DB Connection Error:', err));

async function emulate() {
    try {
        let log = '--- Emulating Controller Logic ---\n';

        // Mock request: branchId = 'Kalmunai'
        let branchId = 'Kalmunai';
        log += `Input branchId: '${branchId}'\n`;

        // 1. Resolve Branch
        const branchRecord = await BranchManager.findOne({
            $or: [{ branchId: branchId }, { branchName: branchId }]
        }).select('branchId').lean();

        if (branchRecord) {
            branchId = branchRecord.branchId;
            log += `Resolved branchId: '${branchId}'\n`;
        } else {
            log += `Branch NOT found!\n`;
        }

        // 2. Find FVs
        const fvs = await FieldVisitor.find({ branchId }).select('name userId').lean();
        log += `FVs Found: ${fvs.length}\n`;

        // 3. Find Members (EXACTLY as in controller)
        const members = await Member.find({ branchId }).select('name memberId contact address fieldVisitorId').lean();
        log += `Members Found: ${members.length}\n`;

        // 4. Map Members to FVs
        const fvMembersMap = new Map();
        members.forEach(m => {
            const fvId = m.fieldVisitorId?.toString();
            if (fvId) {
                if (!fvMembersMap.has(fvId)) {
                    fvMembersMap.set(fvId, []);
                }
                fvMembersMap.get(fvId).push({
                    name: m.name,
                    memberId: m.memberId
                });
            } else {
                // log += `Warning: Member ${m.name} has NO fieldVisitorId\n`;
            }
        });

        log += `Map Size: ${fvMembersMap.size}\n`;

        // 5. Construct Result
        const results = [];
        fvs.forEach(fv => {
            const fvId = fv._id.toString();
            const fvMembers = fvMembersMap.get(fvId) || [];
            log += `FV: ${fv.name} (${fvId}) -> MemberCount: ${fvMembers.length}\n`;
            results.push({
                name: fv.name,
                memberCount: fvMembers.length
            });
        });

        fs.writeFileSync('backend/emulate_log.txt', log);
        console.log(log);

    } catch (e) {
        console.error(e);
    } finally {
        mongoose.connection.close();
    }
}

emulate();
