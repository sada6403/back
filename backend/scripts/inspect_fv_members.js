const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config({ path: 'backend/.env' });

const Member = require('../models/Member');
const FieldVisitor = require('../models/FieldVisitor');

// Connect to DB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('DB Connected'))
    .catch(err => {
        fs.writeFileSync('backend/fv_debug_log.txt', 'DB Connection Error: ' + err.message);
        console.error('DB Connection Error:', err);
    });

async function inspectData() {
    try {
        let log = '--- Inspecting Data ---\n';

        // 1. Get a few FVs
        const fvs = await FieldVisitor.find().limit(3).lean();
        log += `Found ${fvs.length} FVs.\n`;

        for (const fv of fvs) {
            const fvIdStr = fv._id.toString();
            log += `FV: ${fv.name} (ID: ${fvIdStr}, Branch: ${fv.branchId})\n`;

            // Check member counts specifically for this FV
            const count = await Member.countDocuments({ fieldVisitorId: fv._id });
            log += `  -> Count (ObjectId): ${count}\n`;

            // Check members and their branchIds
            const members = await Member.find({ fieldVisitorId: fv._id }).limit(3).lean();
            if (members.length > 0) {
                log += `  -> Sample Members Branch IDs: ${members.map(m => m.branchId).join(', ')}\n`;
                const mismatch = members.some(m => m.branchId !== fv.branchId);
                if (mismatch) {
                    log += `  -> MISMATCH DETECTED! Member Branch != FV Branch (${fv.branchId})\n`;
                } else {
                    log += `  -> Branch IDs match.\n`;
                }
            }
        }

        fs.writeFileSync('backend/fv_debug_log.txt', log);
        console.log('Log written to backend/fv_debug_log.txt');

    } catch (e) {
        fs.writeFileSync('backend/fv_debug_log.txt', 'Error: ' + e.message + '\n' + e.stack);
        console.error('Error:', e);
    } finally {
        mongoose.connection.close();
    }
}

inspectData();
