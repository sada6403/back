const mongoose = require('mongoose');
require('dotenv').config();

const BranchManager = require('./models/BranchManager');

async function checkDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const count = await BranchManager.countDocuments();
        console.log('Total Managers:', count);

        const lastBatch = await BranchManager.find().sort({ _id: -1 }).limit(5);
        console.log('Last 5 Managers:');
        lastBatch.forEach(m => console.log(`- ${m.userId} (${m.email})`));

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkDB();
