const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

async function renameBranch() {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;

        // 1. Update fieldvisitors (KA or Kandavalai -> Kandawalai)
        console.log('Updating fieldvisitors...');
        const fvResult = await db.collection('fieldvisitors').updateMany(
            { branchName: { $in: ["KA", "Kandavalai"] } },
            { $set: { branchName: "Kandawalai" } }
        );
        console.log(`Updated ${fvResult.modifiedCount} Field Visitors.`);

        // 2. Update branchmanagers
        console.log('Updating branchmanagers...');
        const bmResult = await db.collection('branchmanagers').updateMany(
            { branchName: { $in: ["KA", "Kandavalai"] } },
            { $set: { branchName: "Kandawalai" } }
        );
        console.log(`Updated ${bmResult.modifiedCount} Branch Managers.`);

        // 3. Update members
        console.log('Updating members...');
        const memResult = await db.collection('members').updateMany(
            { branchName: { $in: ["KA", "Kandavalai"] } },
            { $set: { branchName: "Kandawalai" } }
        );
        console.log(`Updated ${memResult.modifiedCount} Members.`);

        console.log('Branch renaming to Kandawalai completed successfully!');

    } catch (err) {
        console.error('Error renaming branch:', err);
    } finally {
        await mongoose.disconnect();
    }
}

renameBranch();
