require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Manager = require('../models/Manager');

async function checkManagers() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB\n');

        const managers = await Manager.find({}).sort({ code: 1 });

        console.log(`Total Branch Managers: ${managers.length}\n`);
        console.log('List of Branch Managers:');
        console.log('='.repeat(80));

        managers.forEach((m, i) => {
            console.log(`${i + 1}. ${m.code} | ${m.name} | Branch: ${m.branchId} | Email: ${m.email}`);
        });

        console.log('='.repeat(80));

        // Group by branch
        const byBranch = {};
        managers.forEach(m => {
            if (!byBranch[m.branchId]) byBranch[m.branchId] = [];
            byBranch[m.branchId].push(m);
        });

        console.log('\nManagers by Branch:');
        Object.keys(byBranch).sort().forEach(branch => {
            console.log(`\n${branch}: ${byBranch[branch].length} manager(s)`);
            byBranch[branch].forEach(m => {
                console.log(`  - ${m.code}: ${m.name}`);
            });
        });

        process.exit(0);
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
}

checkManagers();
