require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { MongoClient } = require('mongodb');

async function checkSpecificFVs() {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db('nf-farming');

        // IDs to check
        const targetIds = [];
        for (let i = 1; i <= 11; i++) {
            targetIds.push(`FV-KA-${String(i).padStart(3, '0')}`);
        }

        console.log('Checking for IDs:', targetIds);

        const fvs = await db.collection('fieldvisitors').find({
            userId: { $in: targetIds }
        }).toArray();

        console.log(`\nFound ${fvs.length} out of ${targetIds.length} Field Visitors.`);

        fvs.forEach(fv => {
            console.log(`Found: ${fv.userId} - ${fv.fullName}`);
            console.log(`  Branch: "${fv.branchName}"`);
            console.log(`  Status: ${fv.status}`);
            console.log(`  IsDeleted: ${fv.isDeleted}`);
        });

        // Also check if they exist in a different collection or backup?
        // Check "users" collection too if applicable
        const users = await db.collection('users').find({
            userId: { $in: targetIds }
        }).toArray();
        console.log(`\nFound ${users.length} in 'users' collection.`);
        users.forEach(u => {
            console.log(`User: ${u.userId} - Role: ${u.role}`);
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.close();
    }
}

checkSpecificFVs();
