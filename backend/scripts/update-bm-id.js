require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { MongoClient } = require('mongodb');

async function updateID() {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db('nf-farming');
        const col = db.collection('branchmanagers');

        // Find BM-KA-003
        const target = await col.findOne({ userId: 'BM-KA-003' });

        if (!target) {
            console.log('BM-KA-003 not found');
            return;
        }

        console.log(`Found: ${target.userId} - ${target.fullName} (${target.branchName})`);

        // Update to BM-KA-001
        await col.updateOne(
            { _id: target._id },
            { $set: { userId: 'BM-KA-001' } }
        );

        console.log('✅ Updated BM-KA-003 -> BM-KA-001');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.close();
    }
}

updateID();
