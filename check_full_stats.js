require('dotenv').config({ path: 'backend/.env' });
const mongoose = require('mongoose');

async function checkFullStats() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const db = mongoose.connection.db;

        const members = await db.collection('members').countDocuments();
        const products = await db.collection('products').countDocuments();
        const transactions = await db.collection('transactions').countDocuments();

        const managers = await db.collection('managers').countDocuments();
        // Check how many managers are actually IT Sector role
        const itSector = await db.collection('managers').countDocuments({ role: 'it_sector' });
        const realManagers = await db.collection('managers').countDocuments({ role: 'manager' });

        const fieldVisitors = await db.collection('fieldvisitors').countDocuments();
        const employees = await db.collection('employees').countDocuments(); // Should be 0 based on previous checks

        console.log('--- DB FULL STATS ---');
        console.log(`Members: ${members}`);
        console.log(`Products: ${products}`);
        console.log(`Transactions: ${transactions}`);
        console.log(`Total Managers Collection: ${managers}`);
        console.log(`  - Role 'it_sector': ${itSector}`);
        console.log(`  - Role 'manager': ${realManagers}`);
        console.log(`Field Visitors: ${fieldVisitors}`);
        console.log(`Generic Employees: ${employees}`);

    } catch (e) { console.error(e); }
    finally { mongoose.disconnect(); }
}
checkFullStats();
