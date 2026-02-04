const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('./models/Product');
const Transaction = require('./models/Transaction');

async function syncData() {
    try {
        console.log('Connecting to AWS Database...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected!');

        const products = await Product.find();
        console.log(`Processing ${products.length} products...`);

        for (const p of products) {
            console.log(`\nSyncing: ${p.name}`);

            const txs = await Transaction.find({ productName: p.name });

            let bQty = 0, sQty = 0, bAmt = 0, sAmt = 0;
            txs.forEach(t => {
                if (t.type === 'buy') {
                    bQty += (t.quantity || 0);
                    bAmt += (t.totalAmount || 0);
                } else if (t.type === 'sell') {
                    sQty += (t.quantity || 0);
                    sAmt += (t.totalAmount || 0);
                }
            });

            const newStock = bQty - sQty;
            const newSoldVal = sAmt;
            const newBoughtVal = bAmt;

            console.log(`  - New Stock: ${newStock}`);
            console.log(`  - New Revenue Calc: ${sAmt - bAmt}`);

            p.currentStock = newStock;
            p.totalSoldValue = newSoldVal;
            p.totalBoughtValue = newBoughtVal;

            await p.save();
            console.log(`  [✓] Updated successfully.`);
        }

        console.log('\n--- ALL PRODUCTS SYNCED TO CLOUD ---');
        mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error('SYNC ERROR:', err);
        process.exit(1);
    }
}

syncData();
