require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { MongoClient } = require('mongodb');

async function updateKandavalaiID() {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db('nf-farming');
        const col = db.collection('branchmanagers');

        // Find Kandavalai Branch Manager
        const kandavalai = await col.findOne({
            branchName: /kandavalai|kandavala/i
        });

        if (!kandavalai) {
            console.log('❌ Kandavalai Branch Manager not found');
            return;
        }

        console.log(`Found: ${kandavalai.userId} - ${kandavalai.fullName}`);

        if (kandavalai.userId === 'BM-KA-001') {
            console.log('✅ Already has correct ID: BM-KA-001');
            return;
        }

        // Update to BM-KA-001
        const result = await col.updateOne(
            { _id: kandavalai._id },
            { $set: { userId: 'BM-KA-001' } }
        );

        if (result.modifiedCount > 0) {
            console.log(`✅ Updated: ${kandavalai.userId} -> BM-KA-001`);
        } else {
            console.log('❌ Update failed');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.close();
    }
}

updateKandavalaiID();
