require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        const count = await mongoose.connection.collection('transactions').countDocuments({});
        console.log('Total transactions in AWS DB:', count);

        const recent = await mongoose.connection.collection('transactions').findOne({}, { sort: { date: -1 } });
        if (recent) {
            console.log('Latest Transaction Date:', recent.date);
        } else {
            console.log('No transactions found in the database.');
        }
        process.exit(0);
    })
    .catch(err => {
        console.error('Error connecting to DB:', err);
        process.exit(1);
    });
