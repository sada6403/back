const mongoose = require('mongoose');
const Product = require('./models/Product');
const Transaction = require('./models/Transaction');
require('dotenv').config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/management_it', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB Connected');
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

const checkValues = async () => {
    await connectDB();

    console.log('--- Inspecting Transactions ---');
    const transactions = await Transaction.find({});
    console.log(`Total Transactions: ${transactions.length}`);

    // Check a few manually
    const sells = transactions.filter(t => t.type === 'sell');
    const buys = transactions.filter(t => t.type === 'buy');
    console.log(`Sells: ${sells.length}, Buys: ${buys.length}`);

    if (sells.length > 0) {
        console.log('Sample Sell:', JSON.stringify(sells[0], null, 2));
    }

    console.log('\n--- Inspecting Aggregation ---');
    // Replicate controller logic
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    // Simple fetch first
    const products = await Product.find({});
    console.log(`Found ${products.length} products.`);

    for (const p of products) {
        // Perform manual aggregation check
        const pTxs = transactions.filter(t => t.productName === p.name);
        const calcSoldVal = pTxs.filter(t => t.type === 'sell').reduce((sum, t) => sum + (t.totalAmount || 0), 0);
        const calcBoughtVal = pTxs.filter(t => t.type === 'buy').reduce((sum, t) => sum + (t.totalAmount || 0), 0);

        console.log(`Product: ${p.name}`);
        console.log(`  Manual Calc -> SoldVal: ${calcSoldVal}, BoughtVal: ${calcBoughtVal}`);
        console.log(`  DB Stored (if any) -> soldPerMonth: ${p.soldPerMonth}, currentStock: ${p.currentStock}`);
    }

    process.exit(0);
};

checkValues();
