const mongoose = require('mongoose');
require('dotenv').config();
const Member = require('./models/Member');

// Define User Schema inline to avoid file path issues, or use generic collection access
const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema, 'users');

// FieldVisitor schema if needed, but 'users' collection often holds auth data
// Depending on auth implementation, it might be in 'users' or 'fieldvisitors'
// The backend `auth.js` or `employee_service.dart` suggests specific collections.
// Let's assume 'users' collection is the main auth.

const uri = process.env.MONGO_URI;

mongoose.connect(uri)
    .then(async () => {
        console.log('✅ Connected to DB\n');

        // 1. List Users
        console.log('--- USERS ---');
        const users = await User.find({}).lean();
        users.forEach(u => {
            console.log(`User: ${u.name || u.username} (_id: ${u._id}) - Role: ${u.role}`);
        });
        console.log(`Total Users: ${users.length}\n`);

        // 2. List Members
        console.log('--- MEMBERS ---');
        const members = await Member.find({}).lean();
        members.forEach(m => {
            console.log(`Member: ${m.name} (_id: ${m._id}) - Assigned FV: ${m.fieldVisitorId}`);
        });
        console.log(`Total Members: ${members.length}\n`);

        // 3. Logic Check
        console.log('--- MISMATCH CHECK ---');
        if (users.length > 0 && members.length > 0) {
            const memberFvIds = new Set(members.map(m => m.fieldVisitorId?.toString()));
            let matched = 0;
            users.forEach(u => {
                if (memberFvIds.has(u._id.toString())) {
                    console.log(`✅ User ${u.name} OWNS members.`);
                    matched++;
                }
            });
            if (matched === 0) {
                console.log('❌ NO Users match the member assignments.');
                console.log('   This explains why the dashboard is empty.');
            }
        }

        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
