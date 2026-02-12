require('dotenv').config();
const mongoose = require('mongoose');
const Member = require('../models/Member');
const Transaction = require('../models/Transaction');
const fs = require('fs');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/management_it');
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('Connection Error:', err);
        process.exit(1);
    }
};

const checkMembers = async () => {
    await connectDB();

    try {
        const missingMemberIds = await Member.find({
            $or: [
                { memberId: { $exists: false } },
                { memberId: null },
                { memberId: '' }
            ]
        }).select('_id name');

        let output = `Members with MISSING memberId: ${missingMemberIds.length}\n`;

        let recoverableCount = 0;
        const recoverableSamples = [];

        for (const m of missingMemberIds) {
            // Find ANY transaction for this member
            const tx = await Transaction.findOne({ memberId: m._id }).select('memberCode');
            if (tx && tx.memberCode) {
                recoverableCount++;
                if (recoverableSamples.length < 5) {
                    recoverableSamples.push({
                        id: m._id,
                        name: m.name,
                        recoveredCode: tx.memberCode
                    });
                }
            }
        }

        output += `Members with RECOVERABLE code from Transactions: ${recoverableCount}\n`;

        if (recoverableSamples.length > 0) {
            output += '--- Sample Recoverable Codes ---\n';
            recoverableSamples.forEach(s => {
                output += `ID: ${s.id}, Name: ${s.name} -> Code: ${s.recoveredCode}\n`;
            });
        }

        fs.writeFileSync('debug_recovery.txt', output);
        console.log('Output written to debug_recovery.txt');

    } catch (error) {
        console.error('Error:', error);
        fs.writeFileSync('debug_recovery.txt', `Error: ${error.message}`);
    } finally {
        mongoose.connection.close();
    }
};

checkMembers();
