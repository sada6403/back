const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const targetNames = [
    'Dalindan', 'Saliny', 'Sivasri', 'Vadivel', 'Rathika', 'Perampalarasan',
    'kalaivany', 'Sasikala', 'Abiramy', 'Tharsiny', 'Sakila', 'Thabojini',
    'Nishanthini', 'Pakeerathy'
];

async function deepAuditSearch() {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        // Dynamically get the collections since models might not be fully defined
        const db = mongoose.connection.db;
        const auditCollection = db.collection('auditlogs'); // Try common names
        const activityCollection = db.collection('activitylogs');

        console.log('Searching auditlogs...');
        for (let name of targetNames) {
            const logs = await auditCollection.find({
                $or: [
                    { details: new RegExp(name, 'i') },
                    { description: new RegExp(name, 'i') },
                    { targetName: new RegExp(name, 'i') }
                ]
            }).toArray();

            if (logs.length > 0) {
                console.log(`\nMatch for ${name} in auditlogs:`);
                logs.forEach(l => console.log(JSON.stringify(l, null, 2)));
            }
        }

        console.log('\nSearching activitylogs...');
        for (let name of targetNames) {
            const logs = await activityCollection.find({
                $or: [
                    { details: new RegExp(name, 'i') },
                    { description: new RegExp(name, 'i') }
                ]
            }).toArray();

            if (logs.length > 0) {
                console.log(`\nMatch for ${name} in activitylogs:`);
                logs.forEach(l => console.log(JSON.stringify(l, null, 2)));
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

deepAuditSearch();
