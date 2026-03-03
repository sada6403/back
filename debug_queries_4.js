require('dotenv').config();
const mongoose = require('mongoose');
const BranchManager = require('./models/BranchManager');

async function test() {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log('connected');

    console.time('find all ids');
    const docs = await BranchManager.find({}, { _id: 1, userId: 1 }).lean();
    console.timeEnd('find all ids');
    console.log(`Found ${docs.length} docs`);

    for (const doc of docs) {
        console.time(`load ${doc.userId}`);
        const fullDoc = await BranchManager.findById(doc._id).lean();
        console.timeEnd(`load ${doc.userId}`);
        const size = JSON.stringify(fullDoc).length;
        console.log(`Doc ${doc.userId} size: ${size} bytes`);
    }

    process.exit(0);
}
test().catch(console.error);
