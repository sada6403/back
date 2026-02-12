const mongoose = require('mongoose');
const Member = require('../models/Member');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

async function findOriginalIds() {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        console.log('--- Members in Karachchi (BR-KC-001) ---');
        const kcMembers = await Member.find({ branchId: 'BR-KC-001' }).lean();
        const kcFVIds = new Set();
        kcMembers.forEach(m => {
            if (m.fieldVisitorId) kcFVIds.add(m.fieldVisitorId.toString());
        });
        console.log('Original FV IDs found in Karachchi:', Array.from(kcFVIds));

        console.log('\n--- Members in Kandawalai (BR-KA-002) ---');
        const kaMembers = await Member.find({ branchId: 'BR-KA-002' }).lean();
        const kaFVIds = new Set();
        kaMembers.forEach(m => {
            if (m.fieldVisitorId) kaFVIds.add(m.fieldVisitorId.toString());
        });
        console.log('Original FV IDs found in Kandawalai:', Array.from(kaFVIds));

        // Now search for any members whose field_visitor_name matches our targets
        const targets = ['Dalindan', 'Saliny', 'Rathika', 'kalaivany', 'Sasikala', 'Abiramy', 'Sivasri', 'Tharsiny', 'Sakila', 'Thabojini', 'Nishanthini', 'Pakeerathy'];
        for (let name of targets) {
            const mMatch = await Member.findOne({ field_visitor_name: new RegExp(name, 'i') }).lean();
            if (mMatch) {
                console.log(`\nFound Member match for ${name}:`);
                console.log(`  Member: ${mMatch.memberCode} | Branch: ${mMatch.branchId}`);
                console.log(`  Original FV Name in Member record: ${mMatch.field_visitor_name}`);
                console.log(`  Original FV ID in Member record: ${mMatch.fieldVisitorId}`);
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

findOriginalIds();
