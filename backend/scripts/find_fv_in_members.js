const mongoose = require('mongoose');
const Member = require('../models/Member');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const targetNames = [
    'Dalindan', 'Saliny', 'Rathika', 'kalaivany', 'Sasikala', 'Abiramy',
    'Sivasri', 'Tharsiny', 'Sakila', 'Thabojini', 'Nishanthini', 'Pakeerathy'
];

async function findInMembers() {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const members = await Member.find({}).lean();
        console.log(`Searching through ${members.length} members...`);

        for (let m of members) {
            const dataStr = JSON.stringify(m.registrationData || {});

            for (let name of targetNames) {
                if (new RegExp(name, 'i').test(dataStr) || new RegExp(name, 'i').test(m.field_visitor_name || "")) {
                    console.log(`\nMatch found for ${name} in Member ${m.memberCode}:`);
                    console.log(`  FV Name: ${m.field_visitor_name}`);
                    console.log(`  FV ID: ${m.field_visitor_id}`);
                    console.log(`  Registration Data: ${dataStr}`);
                }
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

findInMembers();
