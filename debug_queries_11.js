require('dotenv').config();
const mongoose = require('mongoose');
const FieldVisitor = require('./models/FieldVisitor');

async function test() {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

    const doc = await FieldVisitor.findOne({ userId: 'FV-KM-011' }).lean();
    if (!doc) {
        console.log("Not found.");
        process.exit(1);
    }

    for (const key of Object.keys(doc)) {
        const val = doc[key];
        const size = JSON.stringify(val) ? JSON.stringify(val).length : 0;
        console.log(`Field ${key}: ${size} bytes`);
    }

    process.exit(0);
}
test().catch(console.error);
