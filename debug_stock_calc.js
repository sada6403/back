const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('./models/Product');
const Transaction = require('./models/Transaction');

mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://abisivan1827:abi12345@cluster0.fbfeh.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0')
    .then(async () => {
        console.log('Connected to DB');

        const products = await Product.find().lean();
        const transactions = await Transaction.find().lean();

        console.log(`Total Products: ${products.length}`);
        console.log(`Total Transactions: ${transactions.length}`);

        console.log('\n--- Product Names ---');
        products.forEach(p => console.log(`"${p.name}" (ID: ${p._id})`));

        console.log('\n--- Transaction Product Names & Status ---');
        transactions.forEach(t => {
            console.log(`Type: ${t.type}, Qty: ${t.quantity}, Product: "${t.productName}", Status: "${t.status}"`);
        });

        console.log('\n--- Matching Test ---');
        products.forEach(p => {
            const matches = transactions.filter(t => t.productName === p.name && t.status === 'approved');
            const totalBuy = matches.filter(t => t.type === 'buy').reduce((s, t) => s + t.quantity, 0);
            const totalSell = matches.filter(t => t.type === 'sell').reduce((s, t) => s + t.quantity, 0);
            console.log(`Product: "${p.name}" -> Matches: ${matches.length}, Buy: ${totalBuy}, Sell: ${totalSell}, Calc Stock: ${totalBuy - totalSell}`);
        });

        mongoose.connection.close();
    })
    .catch(err => console.error(err));
