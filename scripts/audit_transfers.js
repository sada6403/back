const mongoose = require('mongoose');
require('dotenv').config();

async function checkTransfers() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const db = mongoose.connection.useDb('nf-farming');

        console.log('--- Aggregated Statuses ---');
        const counts = await db.collection('companytransfers').aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]).toArray();
        console.log(JSON.stringify(counts, null, 2));

        console.log('\n--- Recent Transfers (last 5) ---');
        const recent = await db.collection('companytransfers').find({}).sort({ createdAt: -1 }).limit(5).toArray();
        console.log(JSON.stringify(recent, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkTransfers();
