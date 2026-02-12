const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const Transaction = require('./models/Transaction');
const FieldVisitor = require('./models/FieldVisitor');
const BranchManager = require('./models/BranchManager');

async function checkMapping() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/nature_farming');
        console.log('Connected');

        const branches = await BranchManager.find().select('branchId branchName').lean();
        console.log('Branch Mapping (BM):', JSON.stringify(branches, null, 2));

        const transactions = await Transaction.aggregate([
            { $group: { _id: '$branchId', count: { $sum: 1 } } }
        ]);
        console.log('Transaction Branch IDs:', JSON.stringify(transactions, null, 2));

        process.exit(0);
    } catch (err) {
        process.exit(1);
    }
}
checkMapping();
