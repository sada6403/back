const mongoose = require('mongoose');
require('dotenv').config();

const Transaction = require('../models/Transaction');

const testQuery = async () => {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        if (!uri) {
            console.error('Neither MONGO_URI nor MONGODB_URI found in process.env');
            process.exit(1);
        }
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const billNumber = 'NF-B-20260205-00032';
        console.log(`Executing find for billNumber: "${billNumber}"`);

        const results = await Transaction.find({ billNumber }).lean();
        console.log(`Results Found: ${results.length}`);

        if (results.length > 0) {
            results.forEach(r => console.log(` - ${r.billNumber} (ID: ${r._id})`));
        } else {
            console.log('No exact match. Trying regex search...');
            const regexResults = await Transaction.find({ billNumber: { $regex: '00032' } }).limit(5).lean();
            console.log(`Regex Results: ${regexResults.length}`);
            regexResults.forEach(r => console.log(` - ${r.billNumber}`));
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

testQuery();
