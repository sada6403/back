const mongoose = require('mongoose');
const BranchManager = require('./models/BranchManager');
const FieldVisitor = require('./models/FieldVisitor');
const ITSector = require('./models/ITSector');
const axios = require('axios');
require('dotenv').config();

async function verify() {
    const API_URL = 'http://localhost:3001/api/employees'; // Fixed port
    const testId = 'BM-JA-002';

    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

    console.log('--- Initial State ---');
    let bm = await BranchManager.findOne({ userId: testId });
    console.log('Status:', bm.status);
    console.log('Password Length:', bm.password.length);
    console.log('Backup Password:', bm.backupPassword || 'None');

    console.log('\n--- Toggling to Inactive ---');
    try {
        await axios.patch(`${API_URL}/${testId}/status`);
        bm = await BranchManager.findOne({ userId: testId });
        console.log('New Status:', bm.status);
        console.log('New Password:', bm.password);
        console.log('Backup Password Length:', bm.backupPassword ? bm.backupPassword.length : 'Missing');
    } catch (e) {
        console.error('Toggle failed:', e.message);
    }

    console.log('\n--- Toggling to Active ---');
    try {
        await axios.patch(`${API_URL}/${testId}/status`);
        bm = await BranchManager.findOne({ userId: testId });
        console.log('Final Status:', bm.status);
        console.log('Final Password Length:', bm.password.length);
        console.log('Backup Password:', bm.backupPassword || 'None');
    } catch (e) {
        console.error('Restore failed:', e.message);
    }

    process.exit(0);
}

verify();
