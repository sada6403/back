const mongoose = require('mongoose');
require('dotenv').config();

const Transaction = require('./models/Transaction');

const checkBill = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const billNumber = 'NF-B-20260205-00032';
        const tx = await Transaction.findOne({ billNumber }).lean();

        if (tx) {
            console.log('Transaction Found!');
            console.log('Bill Number:', tx.billNumber);
            console.log('Branch ID:', tx.branchId);
            console.log('Date:', tx.date);
            console.log('Member Code:', tx.memberCode);
        } else {
            console.log('Transaction NOT found in DB:', billNumber);

            // Search by regex to see if there are similar ones
            const similar = await Transaction.find({ billNumber: { $regex: '00032' } }).limit(5).lean();
            console.log(`Found ${similar.length} similar transactions:`);
            similar.forEach(s => console.log(' - ', s.billNumber));
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkBill();
