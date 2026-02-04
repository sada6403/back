const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

const Product = require('./models/Product');
const Transaction = require('./models/Transaction');

async function diagnose() {
    let output = '';
    const log = (msg) => {
        console.log(msg);
        output += msg + '\n';
    };

    try {
        log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        log('Connected successfully!');

        const tx = await Transaction.findOne().lean();
        if (tx) {
            log('\nExample Transaction Structure:');
            log(`- productName: ${tx.productName} (type: ${typeof tx.productName})`);
            log(`- quantity: ${tx.quantity} (type: ${typeof tx.quantity})`);
            log(`- totalAmount: ${tx.totalAmount} (type: ${typeof tx.totalAmount})`);
            log(`- date: ${tx.date} (type: ${typeof tx.date}, isDate: ${tx.date instanceof Date})`);
            log(`- type: ${tx.type} (type: ${typeof tx.type})`);
        }

        const pCount = await Product.countDocuments();
        log(`\nTotal Products: ${pCount}`);

        const products = await Product.find().lean();
        for (const p of products) {
            log(`\nProduct: "${p.name}"`);

            // Re-run the aggregation logic manually to see what mongo would see
            const txs = await Transaction.find({ productName: p.name }).lean();
            log(`  - Transactions count: ${txs.length}`);

            let bQty = 0, sQty = 0, bAmt = 0, sAmt = 0;
            txs.forEach(t => {
                if (t.type === 'buy') {
                    bQty += (typeof t.quantity === 'number' ? t.quantity : 0);
                    bAmt += (typeof t.totalAmount === 'number' ? t.totalAmount : 0);
                } else if (t.type === 'sell') {
                    sQty += (typeof t.quantity === 'number' ? t.quantity : 0);
                    sAmt += (typeof t.totalAmount === 'number' ? t.totalAmount : 0);
                }
            });
            log(`  - Manual Calc: Stock ${bQty - sQty}, Revenue ${sAmt - bAmt}`);
        }

        fs.writeFileSync('diag_output_v2.txt', output, 'utf8');
        mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        log('DIAGNOSE ERROR: ' + err.message);
        process.exit(1);
    }
}

diagnose();
