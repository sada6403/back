const mongoose = require('mongoose');
const BranchManager = require('./models/BranchManager');
const FieldVisitor = require('./models/FieldVisitor');
const ITSector = require('./models/ITSector');
const axios = require('axios');
require('dotenv').config();

async function verify() {
    const API_URL = 'http://localhost:3001/api/employees';
    const testId = 'BM-JA-002';

    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        console.log('Connected to DB');

        // Ensure we start with Active
        let user = await BranchManager.findOne({ userId: testId });
        if (!user) {
            console.error('User not found in DB');
            process.exit(1);
        }

        if (user.status === 'inactive') {
            console.log('User is currently inactive. Toggling to active first...');
            await axios.patch(`${API_URL}/${testId}/status`);
            user = await BranchManager.findOne({ userId: testId });
        }

        const originalPwd = user.password;
        console.log('--- Step 1: Initial State ---');
        console.log('Status:', user.status);
        console.log('Password Starts With:', user.password.substring(0, 10) + '...');
        console.log('Backup Password:', user.backupPassword || 'None');

        console.log('\n--- Step 2: Toggle to Inactive ---');
        await axios.patch(`${API_URL}/${testId}/status`);
        user = await BranchManager.findOne({ userId: testId });
        console.log('New Status:', user.status);
        console.log('New Password:', user.password);
        console.log('Backup Password Match original?', user.backupPassword === originalPwd ? 'YES' : 'NO');

        console.log('\n--- Step 3: Toggle to Active ---');
        await axios.patch(`${API_URL}/${testId}/status`);
        user = await BranchManager.findOne({ userId: testId });
        console.log('Final Status:', user.status);
        console.log('Final Password Match original?', user.password === originalPwd ? 'YES' : 'NO');
        console.log('Backup Password cleared?', !user.backupPassword ? 'YES' : 'NO');

    } catch (e) {
        console.error('Error:', e.response ? e.response.data : e.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

verify();
