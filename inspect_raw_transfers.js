const mongoose = require('mongoose');
require('dotenv').config();

async function inspectRaw() {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        const collection = mongoose.connection.db.collection('companytransfers');
        const docs = await collection.find({}).toArray();

        console.log('Total Docs:', docs.length);
        docs.forEach((doc, i) => {
            console.log(`\nDoc ${i + 1}:`);
            console.log(JSON.stringify(doc, null, 2));
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
inspectRaw();
