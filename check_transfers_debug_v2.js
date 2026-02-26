const mongoose = require('mongoose');
require('dotenv').config();

async function checkTransfers() {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        console.log('DB Connected');

        const db = mongoose.connection.db;
        const collection = db.collection('companytransfers');

        const allTransfers = await collection.find({}).toArray();
        console.log('Total transfers in DB:', allTransfers.length);

        if (allTransfers.length > 0) {
            const first = allTransfers[0];
            console.log('First document fields:', Object.keys(first));

            const hasNewFields = allTransfers.filter(t => t.userId).length;
            const hasOldFields = allTransfers.filter(t => t.submittedBy).length;

            console.log('Documents with userId (New):', hasNewFields);
            console.log('Documents with submittedBy (Old):', hasOldFields);

            const statuses = [...new Set(allTransfers.map(t => t.status))];
            console.log('All distinct statuses:', statuses);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkTransfers();
