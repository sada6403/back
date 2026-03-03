require('dotenv').config();
const mongoose = require('mongoose');
const BranchManager = require('./models/BranchManager');

async function test() {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log('connected');

    console.time('countDocuments');
    const count = await BranchManager.countDocuments();
    console.timeEnd('countDocuments');
    console.log('BranchManager count:', count);

    process.exit(0);
}
test().catch(console.error);
