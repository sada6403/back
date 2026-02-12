const mongoose = require('mongoose');
const User = require('../models/User');
const FieldVisitor = require('../models/FieldVisitor');
const Member = require('../models/Member');
const BranchManager = require('../models/BranchManager');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const names = ['Dalindan', 'Saliny', 'Sivasri', 'Vadivel', 'Rathika', 'Perampalarasan'];

async function check() {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        console.log('\n--- ALL Field Visitors with non-placeholder data ---');
        const allFVs = await FieldVisitor.find({
            $or: [
                { nic: { $exists: true, $ne: null, $ne: "" } },
                { phone: { $exists: true, $ne: "0770000000", $ne: "" } }
            ]
        }).lean();
        allFVs.forEach(f => {
            console.log(`${f.userId} | ${f.fullName} | Phone: ${f.phone} | NIC: ${f.nic} | Branch: ${f.branchId}`);
        });

        const searchNames = [
            'Dalindan', 'Saliny', 'Rathika', 'kalaivany', 'Sasikala', 'Abiramy',
            'Sivasri', 'Tharsiny', 'Sakila', 'Thabojini', 'Nishanthini', 'Pakeerathy'
        ];

        console.log('\n--- Searching User collection for any name matches ---');
        for (let name of searchNames) {
            const users = await User.find({
                $or: [
                    { userId: new RegExp(name, 'i') },
                    { email: new RegExp(name, 'i') },
                    { name: new RegExp(name, 'i') }
                ]
            }).lean();
            users.forEach(u => {
                console.log(`User: ${u.userId} | Name: ${u.name} | Email: ${u.email} | Role: ${u.role} | Branch: ${u.branchId}`);
            });
        }

        console.log('\n--- Searching ALL Members (first small batch) for any FV clues ---');
        const members = await Member.find({}).limit(100).lean();
        members.forEach(m => {
            if (m.field_visitor_name || m.field_visitor_id) {
                console.log(`Member: ${m.memberCode} | FV: ${m.field_visitor_id} - ${m.field_visitor_name}`);
            }
        });

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

check();
