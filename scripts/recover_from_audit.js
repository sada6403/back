const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const targetNames = [
    'Dalindan', 'Saliny', 'Sivasri', 'Vadivel', 'Rathika', 'Perampalarasan',
    'kalaivany', 'Sasikala', 'Abiramy', 'Tharsiny', 'Sakila', 'Thabojini',
    'Nishanthini', 'Pakeerathy'
];

async function recoverFromAudit() {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const activityCollection = db.collection('activitylogs');
        const auditCollection = db.collection('auditlogs');

        console.log('Searching activitylogs for Employee details...');
        const activities = await activityCollection.find({
            action: /Employee/i
        }).toArray();

        const results = {};

        activities.forEach(log => {
            for (let name of targetNames) {
                if (new RegExp(name, 'i').test(log.details) || new RegExp(name, 'i').test(log.target)) {
                    console.log(`\nMatch for ${name} in activity:`);
                    console.log(JSON.stringify(log, null, 2));

                    // Try to extract phone/NIC if present in details (sometimes logs have the whole object)
                    if (log.details.includes('NIC:') || log.details.includes('Phone:')) {
                        console.log("  >>> DATA FOUND IN LOG STRING <<<");
                    }
                }
            }
        });

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

recoverFromAudit();
