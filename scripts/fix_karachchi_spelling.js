const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

async function renameKCBranch() {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;

        // 1. Update fieldvisitors (KC -> Karachchi)
        console.log('Updating fieldvisitors...');
        const fvResult = await db.collection('fieldvisitors').updateMany(
            { branchName: "KC" },
            { $set: { branchName: "Karachchi" } }
        );
        console.log(`Updated ${fvResult.modifiedCount} Field Visitors.`);

        // 2. Update branchmanagers
        console.log('Updating branchmanagers...');
        const bmResult = await db.collection('branchmanagers').updateMany(
            { branchName: "KC" },
            { $set: { branchName: "Karachchi" } }
        );
        console.log(`Updated ${bmResult.modifiedCount} Branch Managers.`);

        // 3. Update members
        console.log('Updating members...');
        const memResult = await db.collection('members').updateMany(
            { branchName: "KC" },
            { $set: { branchName: "Karachchi" } }
        );
        console.log(`Updated ${memResult.modifiedCount} Members.`);

        console.log('Branch renaming from KC to Karachchi completed successfully!');

    } catch (err) {
        console.error('Error renaming branch:', err);
    } finally {
        await mongoose.disconnect();
    }
}

renameKCBranch();
