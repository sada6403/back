const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config({ path: 'backend/.env' });

const BranchManager = require('../models/BranchManager');

// Connect to DB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('DB Connected'))
    .catch(err => {
        fs.writeFileSync('backend/bm_debug_log.txt', 'DB Connection Error: ' + err.message);
        console.error('DB Connection Error:', err);
    });

async function inspectData() {
    try {
        let log = '--- Inspecting Branch Managers ---\n';

        const branches = await BranchManager.find({}).lean();
        log += `Found ${branches.length} Branch Managers.\n`;

        branches.forEach(b => {
            log += `BM: ${b.name}, Branch Name: '${b.branchName}', Branch ID: '${b.branchId}'\n`;
        });

        // Specific check for Kalmunai
        const kalmunai = await BranchManager.find({
            $or: [{ branchName: 'Kalmunai' }, { branchName: /Kalmunai/i }]
        }).lean();

        log += `\nSearching for 'Kalmunai': Found ${kalmunai.length}\n`;
        kalmunai.forEach(k => {
            log += ` - ID: ${k._id}, BranchID: ${k.branchId}, BranchName: ${k.branchName}\n`;
        });

        fs.writeFileSync('backend/bm_debug_log.txt', log);
        console.log('Log written to backend/bm_debug_log.txt');

    } catch (e) {
        fs.writeFileSync('backend/bm_debug_log.txt', 'Error: ' + e.message + '\n' + e.stack);
        console.error('Error:', e);
    } finally {
        mongoose.connection.close();
    }
}

inspectData();
