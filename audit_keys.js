const mongoose = require('mongoose');
require('dotenv').config();

async function auditKeys() {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        const collection = mongoose.connection.db.collection('companytransfers');
        const docs = await collection.find({}).toArray();

        console.log('Audit Results:');
        const keyStats = {};
        docs.forEach(doc => {
            Object.keys(doc).forEach(k => {
                keyStats[k] = (keyStats[k] || 0) + 1;
            });
        });
        console.log(JSON.stringify(keyStats, null, 2));

        // Also check one with "imageUrl" to see userModel equivalent
        const oldDoc = docs.find(d => d.submittedBy);
        if (oldDoc) {
            console.log('Old Doc Sample:', JSON.stringify(oldDoc, null, 2));
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
auditKeys();
