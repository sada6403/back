require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { MongoClient } = require('mongodb');

async function checkBranchNames() {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB\n');

        const db = client.db('nf-farming');

        // Get Kandavalai Branch Manager
        const bm = await db.collection('branchmanagers').findOne({ userId: 'BM-KA-002' });
        console.log('Kandavalai Branch Manager:');
        console.log(`  Branch Name: "${bm.branchName}"`);
        console.log(`  User ID: ${bm.userId}`);

        // Get all Field Visitors with similar branch names
        const fvs = await db.collection('fieldvisitors').find({
            branchName: /kanda/i
        }).toArray();

        console.log(`\nField Visitors with "Kanda*" in branch name: ${fvs.length}`);
        fvs.forEach(fv => {
            console.log(`  ${fv.userId}: ${fv.fullName}`);
            console.log(`    Branch: "${fv.branchName}"`);
        });

        // Check exact match
        const exactMatch = await db.collection('fieldvisitors').find({
            branchName: bm.branchName
        }).toArray();

        console.log(`\nField Visitors with EXACT match "${bm.branchName}": ${exactMatch.length}`);
        exactMatch.forEach(fv => {
            console.log(`  ${fv.userId}: ${fv.fullName}`);
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.close();
    }
}

checkBranchNames();
