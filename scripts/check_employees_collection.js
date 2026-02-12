const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

async function checkEmployees() {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const employeesColl = db.collection('employees');

        const names = [
            'Dalindan Saliny',
            'Perampalarasan Rathika',
            'Sasikaran kalaivany',
            'Sunmugaraja Sasikala',
            'Yokesvaran Abiramy',
            'Vadivel Sivasri',
            'Raveenthirakumar Tharsiny',
            'Thevalingam Sakila',
            'Jeevananthan Thabojini',
            'Sivatharsan Nishanthini',
            'Elangeswaran Pakeerathy'
        ];

        console.log('--- Searching for authentic Field Visitors in employees collection ---');
        for (let name of names) {
            const results = await employeesColl.find({
                $or: [
                    { fullName: new RegExp(name, 'i') },
                    { name: new RegExp(name, 'i') }
                ]
            }).toArray();

            if (results.length > 0) {
                console.log(`\nFound ${results.length} results for: ${name}`);
                results.forEach(r => console.log(JSON.stringify(r, null, 2)));
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

checkEmployees();
