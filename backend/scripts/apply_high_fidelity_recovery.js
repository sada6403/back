const mongoose = require('mongoose');
const FieldVisitor = require('../models/FieldVisitor');
const User = require('../models/User');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const recoveryMap = {
    'FV-KA-001': { phone: '0763108603', nic: '200174502075' },
    'FV-KA-002': { phone: '0767992418', nic: '927373971v' },
    'FV-KA-003': { phone: '0765476914', nic: '978081886v' },
    'FV-KA-004': { phone: '0768767857', nic: '876724260v' },
    'FV-KA-005': { phone: '0743357792', nic: '198186101420' },
    'FV-KA-006': { phone: '0712458295', nic: '755733008v' },
    'FV-KA-007': { phone: '0775328342', nic: '798145401v' },
    'FV-KC-008': { phone: '0771431338', nic: '946264504v' },
    'FV-KC-009': { phone: '0779264129', nic: '767811578v' },
    'FV-KC-010': { phone: '0763442629', nic: '826785373v' },
    'FV-KC-011': { phone: '0778701329', nic: '946123978v' }
};

async function applyRecovery() {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        for (let [userId, data] of Object.entries(recoveryMap)) {
            console.log(`Updating ${userId}...`);
            await FieldVisitor.findOneAndUpdate(
                { userId: userId },
                {
                    phone: data.phone,
                    nic: data.nic,
                    address: 'Recovered from Archives'
                }
            );
            // Also update User record if it exists
            await User.findOneAndUpdate(
                { userId: userId },
                { phone: data.phone, nic: data.nic }
            );
        }

        console.log('High-fidelity recovery completed successfully!');

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

applyRecovery();
