const mongoose = require('mongoose');
require('dotenv').config();
const Product = require('./models/Product');
const Transaction = require('./models/Transaction');
const fs = require('fs');

mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://abisivan1827:abi12345@cluster0.fbfeh.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0')
    .then(async () => {
        const products = await Product.find().lean();
        const transactions = await Transaction.find().lean();
        let out = '';
        products.forEach(p => {
            out += `Product: '${p.name}'\n`;
            const txns = transactions.filter(t => t.productName === p.name);
            out += `  Direct Matches: ${txns.length}\n`;
            if (txns.length === 0) {
                // Fuzzy check
                const fuzzy = transactions.filter(t => t.productName.trim().toLowerCase() === p.name.trim().toLowerCase());
                out += `  Fuzzy Matches: ${fuzzy.length}\n`;
                if (fuzzy.length > 0) {
                    out += `    Ex Transaction Name: '${fuzzy[0].productName}'\n`;
                }
            }
        });
        fs.writeFileSync('debug_short.txt', out);
        mongoose.connection.close();
    })
    .catch(err => console.error(err));
