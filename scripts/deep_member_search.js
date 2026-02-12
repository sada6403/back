const mongoose = require('mongoose');
const Member = require('../models/Member');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const targetFragments = [
    'Dalindan', 'Saliny', 'Sivasri', 'Vadivel', 'Rathika', 'Perampalarasan',
    'kalaivany', 'Sasikala', 'Abiramy', 'Tharsiny', 'Sakila', 'Thabojini',
    'Nishanthini', 'Pakeerathy'
];

async function deepMemberSearch() {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const members = await Member.find({}).lean();
        console.log(`Searching through ${members.length} members for name fragments...`);

        for (let m of members) {
            const memberStr = JSON.stringify(m);
            for (let fragment of targetFragments) {
                if (new RegExp(fragment, 'i').test(memberStr)) {
                    console.log(`\nFRAGMENT MATCH [${fragment}] in Member ${m.memberCode}:`);
                    console.log(JSON.stringify(m, null, 2));
                }
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

deepMemberSearch();
