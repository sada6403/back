const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const names = ['Dalindan', 'Saliny', 'Sivasri', 'Vadivel', 'Rathika', 'Perampalarasan'];
const ids = ['FV-KA-001', 'FV-KA-002', 'FV-KA-003', 'FV-KA-004', 'FV-KA-005', 'FV-KA-006', 'FV-KA-007', 'FV-KC-008', 'FV-KC-009', 'FV-KC-010', 'FV-KC-011'];

async function searchAudit() {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);

        console.log('Available collections:', collectionNames);

        for (let collName of ['auditlogs', 'activitylogs']) {
            if (!collectionNames.includes(collName)) continue;

            console.log(`\n--- Searching ${collName} ---`);
            const coll = db.collection(collName);

            for (let name of names) {
                const results = await coll.find({
                    $or: [
                        { details: new RegExp(name, 'i') },
                        { description: new RegExp(name, 'i') },
                        { 'data.name': new RegExp(name, 'i') }
                    ]
                }).limit(5).toArray();

                if (results.length > 0) {
                    console.log(`Found ${results.length} results for ${name} in ${collName}`);
                    results.forEach(r => console.log(JSON.stringify(r, null, 2)));
                }
            }

            for (let id of ids) {
                const results = await coll.find({
                    $or: [
                        { details: new RegExp(id, 'i') },
                        { userId: id },
                        { 'data.userId': id }
                    ]
                }).limit(5).toArray();

                if (results.length > 0) {
                    console.log(`Found ${results.length} results for ${id} in ${collName}`);
                    results.forEach(r => console.log(JSON.stringify(r, null, 2)));
                }
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

searchAudit();
