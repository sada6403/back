const mongoose = require('mongoose');
const Transaction = require('./models/Transaction');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        const start = new Date('2026-01-25T00:00:00.000Z');
        const end = new Date('2026-02-24T23:59:59.999Z');
        const count = await Transaction.countDocuments({
            date: { $gte: start, $lte: end }
        });
        const total = await Transaction.countDocuments();
        console.log(`Transactions in range: ${count}`);
        console.log(`Total transactions: ${total}`);

        // Let's print the max and min date to see what we have
        const minTx = await Transaction.findOne().sort({ date: 1 });
        const maxTx = await Transaction.findOne().sort({ date: -1 });
        console.log('Earliest:', minTx ? minTx.date : 'N/A');
        console.log('Latest:', maxTx ? maxTx.date : 'N/A');

        process.exit(0);
    })
    .catch(console.error);
