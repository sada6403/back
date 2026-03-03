require('dotenv').config();
const mongoose = require('mongoose');
const FieldVisitor = require('./models/FieldVisitor');

async function test() {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

    // find one of the large docs
    const doc = await FieldVisitor.findOne({ userId: 'FV-KM-011' }).lean();
    if (!doc) process.exit(1);

    let total = 0;
    for (const key of Object.keys(doc)) {
        const val = doc[key];
        const size = JSON.stringify(val) ? JSON.stringify(val).length : 0;
        total += size;
        if (size > 1000) {
            console.log(`LARGE Field ${key}: ${size} bytes`);
        }
    }
    console.log('Total bytes:', total);

    process.exit(0);
}
test().catch(console.error);
