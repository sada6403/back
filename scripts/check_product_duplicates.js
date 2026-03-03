const mongoose = require('mongoose');
require('dotenv').config();
const Product = require('../models/Product');

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        console.log('Connected to DB');

        const products = await Product.find({}, 'name defaultPrice currentStock').sort({ name: 1 });

        console.log(`\nTotal Products: ${products.length}`);

        const nameGroups = {};
        for (let p of products) {
            if (!nameGroups[p.name]) nameGroups[p.name] = [];
            nameGroups[p.name].push({ id: p._id, price: p.defaultPrice, stock: p.currentStock });
        }

        console.log('\nDuplicates Found:');
        for (let name in nameGroups) {
            if (nameGroups[name].length > 1) {
                console.log(`\n${name} (Count: ${nameGroups[name].length})`);
                nameGroups[name].forEach((item, index) => {
                    console.log(`  [${index + 1}] ID: ${item.id} | Price: ${item.price} | Stock: ${item.stock}`);
                });
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
    }
}

run();
