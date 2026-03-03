require('dotenv').config();
const mongoose = require('mongoose');
const BranchManager = require('./models/BranchManager');

async function test() {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log('connected');

    const cursor = BranchManager.find().cursor();
    let count = 0;

    for await (const doc of cursor) {
        console.log(`Doc ${doc.userId} loaded. Stringified size: ${JSON.stringify(doc).length} bytes`);
        count++;
    }

    console.log(`Total docs: ${count}`);
    process.exit(0);
}
test().catch(console.error);
