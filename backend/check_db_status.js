require('dotenv').config({ path: 'backend/.env' });
const mongoose = require('mongoose');

async function checkCounts() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const db = mongoose.connection.db;

        const mgrCount = await db.collection('managers').countDocuments();
        const fvCount = await db.collection('fieldvisitors').countDocuments();
        const bmCount = await db.collection('branchmanagers').countDocuments();
        const empCount = await db.collection('employees').countDocuments();

        console.log('--- DB COUNTS ---');
        console.log('Managers:', mgrCount);
        console.log('Field Visitors:', fvCount);
        console.log('Branch Managers:', bmCount);
        console.log('Employees:', empCount);

        // Also check Dev-007 specifically
        const devUser = await db.collection('managers').findOne({ userId: 'Dev-007' });
        console.log('Dev-007 in managers:', devUser ? 'Found' : 'Not Found');
        if (devUser) console.log('Dev-007 Role:', devUser.role);

    } catch (e) { console.error(e); }
    finally { mongoose.disconnect(); }
}
checkCounts();
