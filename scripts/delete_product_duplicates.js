const mongoose = require('mongoose');
require('dotenv').config();
const Product = require('../models/Product');

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        console.log('Connected to DB');

        const products = await Product.find({}, '_id name currentStock').sort({ name: 1 });

        const nameGroups = {};
        for (let p of products) {
            if (!nameGroups[p.name]) nameGroups[p.name] = [];
            nameGroups[p.name].push({ id: p._id, stock: p.currentStock });
        }

        let deletedCount = 0;

        for (let name in nameGroups) {
            const group = nameGroups[name];
            if (group.length > 1) {
                // Keep the one with the highest stock, or the first one if stocks are equal
                group.sort((a, b) => b.stock - a.stock);

                const toKeep = group[0];
                const toDelete = group.slice(1);

                console.log(`\nProcessing ${name}...`);
                console.log(`  Keeping ID: ${toKeep.id} (Stock: ${toKeep.stock})`);

                for (let item of toDelete) {
                    console.log(`  Deleting Duplicate ID: ${item.id} (Stock: ${item.stock})`);
                    await Product.deleteOne({ _id: item.id });
                    deletedCount++;
                }
            }
        }

        console.log(`\nOperation Complete. Deleted ${deletedCount} duplicate products.`);

    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
    }
}

run();
