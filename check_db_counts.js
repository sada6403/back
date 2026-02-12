const mongoose = require('mongoose');
require('dotenv').config();
const Member = require('./models/Member');
const Transaction = require('./models/Transaction');
const Product = require('./models/Product');

const uri = process.env.MONGO_URI;

mongoose.connect(uri)
    .then(async () => {
        console.log('✅ Connected to DB');

        const memberCount = await Member.countDocuments();
        console.log(`Members Count: ${memberCount}`);

        const txCount = await Transaction.countDocuments();
        console.log(`Transactions Count: ${txCount}`);

        const productCount = await Product.countDocuments();
        console.log(`Products Count: ${productCount}`);

        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
