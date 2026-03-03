require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const FieldVisitor = require('./models/FieldVisitor');

async function test() {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

    const doc = await FieldVisitor.findOne({ userId: 'FV-KM-011' }).lean();
    if (!doc) process.exit(1);

    let out = [];
    for (const key of Object.keys(doc)) {
        const val = doc[key];
        const size = JSON.stringify(val) ? JSON.stringify(val).length : 0;
        if (size > 1000) {
            out.push(`LARGE Field ${key}: ${size} bytes`);
        }
    }
    fs.writeFileSync('large_fields.txt', out.join('\n'));

    process.exit(0);
}
test().catch(console.error);
