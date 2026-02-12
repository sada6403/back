const mongoose = require('mongoose');
const FieldVisitor = require('../models/FieldVisitor');
const User = require('../models/User');
const Member = require('../models/Member');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const targetNames = [
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

async function recover() {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const recoveryMap = {};

        for (let fullName of targetNames) {
            console.log(`\n--- Searching for: ${fullName} ---`);
            const baseName = fullName.split(' ').pop(); // Try searching for the last name/unique part
            const firstName = fullName.split(' ')[0];

            // 1. Search FieldVisitors
            const fvs = await FieldVisitor.find({
                fullName: new RegExp(firstName, 'i')
            }).lean();

            fvs.forEach(fv => {
                if (fv.nic && fv.nic !== "undefined" && fv.phone !== "0770000000") {
                    console.log(`  [FV MATCH] ID: ${fv.userId} | Name: ${fv.fullName} | Phone: ${fv.phone} | NIC: ${fv.nic}`);
                    if (!recoveryMap[fullName]) recoveryMap[fullName] = { phone: fv.phone, nic: fv.nic, address: fv.address };
                }
            });

            // 2. Search Users
            const users = await User.find({
                $or: [
                    { name: new RegExp(firstName, 'i') },
                    { email: new RegExp(firstName, 'i') }
                ]
            }).lean();
            users.forEach(u => {
                console.log(`  [USER MATCH] ID: ${u.userId} | Name: ${u.name} | Email: ${u.email} | Phone: ${u.phone}`);
                if (!recoveryMap[fullName] && u.phone && u.phone !== "0770000000") {
                    recoveryMap[fullName] = { phone: u.phone, nic: u.nic, address: u.address };
                }
            });

            // 3. Search Members (they might be members themselves or have FV info)
            const members = await Member.find({
                $or: [
                    { field_visitor_name: new RegExp(firstName, 'i') },
                    { name: new RegExp(firstName, 'i') }
                ]
            }).lean();
            members.forEach(m => {
                console.log(`  [MEMBER MATCH] Code: ${m.memberCode} | Name: ${m.name} | FV: ${m.field_visitor_name} | Phone: ${m.phone} | NIC: ${m.nic}`);
                if (!recoveryMap[fullName] && m.field_visitor_id && m.field_visitor_id.match(/KA|KC/)) {
                    // If we found a member that *references* our target ID, maybe it has data?
                }
            });
        }

        console.log('\n--- Final Recovery Map ---');
        console.log(JSON.stringify(recoveryMap, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

recover();
