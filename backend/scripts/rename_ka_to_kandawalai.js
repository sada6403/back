const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

async function renameBranch() {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;

        // 1. Update fieldvisitors
        console.log('Updating fieldvisitors...');
        const fvResult = await db.collection('fieldvisitors').updateMany(
            { branchName: "KA" },
            { $set: { branchName: "Kandawalai" } }
        );
        console.log(`Updated ${fvResult.modifiedCount} Field Visitors.`);

        // 2. Update branchmanagers
        console.log('Updating branchmanagers...');
        const bmResult = await db.collection('branchmanagers').updateMany(
            { branchName: "KA" },
            { $set: { branchName: "Kandawalai" } }
        );
        console.log(`Updated ${bmResult.modifiedCount} Branch Managers.`);

        // 3. Update members
        console.log('Updating members...');
        const memResult = await db.collection('members').updateMany(
            { branchName: "KA" },
            { $set: { branchName: "Kandawalai" } }
        );
        console.log(`Updated ${memResult.modifiedCount} Members.`);

        // Verify some samples
        const sampleFV = await db.collection('fieldvisitors').findOne({ branchId: /KA/i });
        console.log('Sample FV After Update:', JSON.stringify(sampleFV, null, 2));

        console.log('Branch renaming from KA to Kandawalai completed successfully!');

    } catch (err) {
        console.error('Error renaming branch:', err);
    } finally {
        await mongoose.disconnect();
    }
}

renameBranch();
