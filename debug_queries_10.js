require('dotenv').config();
const mongoose = require('mongoose');
const FieldVisitor = require('./models/FieldVisitor');

async function test() {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log('connected');

    console.time('find all ids');
    const docs = await FieldVisitor.find({}, { _id: 1, userId: 1 }).lean();
    console.timeEnd('find all ids');
    console.log(`Found ${docs.length} docs`);

    for (const doc of docs) {
        console.time(`load ${doc.userId}`);
        const fullDoc = await FieldVisitor.findById(doc._id).lean();
        console.timeEnd(`load ${doc.userId}`);

        // Let's also parse to see if it causes any infinite loops?
        // JSON.stringify will show if size is huge
        const size = JSON.stringify(fullDoc).length;
        if (size > 5000) {
            console.log(`WARNING: Doc ${doc.userId} size is very large: ${size} bytes`);
        }
    }

    process.exit(0);
}
test().catch(console.error);
