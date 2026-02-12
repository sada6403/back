require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { MongoClient } = require('mongodb');

async function updateKandavalaiTo002() {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db('nf-farming');
        const col = db.collection('branchmanagers');

        // Find BM-KA-003 (Kandavalai)
        const kandavalai = await col.findOne({ userId: 'BM-KA-003' });

        if (!kandavalai) {
            console.log('BM-KA-003 not found');
            return;
        }

        console.log(`Found: ${kandavalai.userId} - ${kandavalai.fullName} (${kandavalai.branchName})`);

        // Update to BM-KA-002
        await col.updateOne(
            { _id: kandavalai._id },
            { $set: { userId: 'BM-KA-002' } }
        );

        console.log('✅ Updated BM-KA-003 -> BM-KA-002');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.close();
    }
}

updateKandavalaiTo002();
