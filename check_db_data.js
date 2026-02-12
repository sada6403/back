const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const Transaction = require('./models/Transaction');
const FieldVisitor = require('./models/FieldVisitor');
const BranchManager = require('./models/BranchManager');

async function checkData() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/nature_farming');
        console.log('Connected to MongoDB');

        const t = await Transaction.findOne();
        console.log('Sample Transaction:', JSON.stringify(t, null, 2));

        const fv = await FieldVisitor.findOne();
        console.log('Sample Field Visitor:', JSON.stringify(fv, null, 2));

        const bm = await BranchManager.findOne();
        console.log('Sample Branch Manager:', JSON.stringify(bm, null, 2));

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkData();
