require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { MongoClient } = require('mongodb');

async function fixBranchManagers() {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db('nf-farming');
        const collections = ['branchmanagers', 'employees', 'managers'];

        for (const colName of collections) {
            console.log(`\nChecking collection: ${colName}`);

            try {
                const col = db.collection(colName);

                // Find records with BM-KA prefix or Kandavalai/Karachi branches
                const results = await col.find({
                    $or: [
                        { branchName: /kandavalai|kandavala|karachi/i },
                        { userId: /BM-KA/ }
                    ]
                }).toArray();

                if (results.length > 0) {
                    console.log(`Found ${results.length} records:`);
                    results.forEach(r => {
                        console.log(`  - ${r.userId}: ${r.fullName || r.name} (${r.branchName})`);
                    });

                    // Fix Kandavalai to BM-KA-001
                    const kandavalai = results.find(r =>
                        r.branchName && r.branchName.toLowerCase().includes('kandavalai')
                    );

                    if (kandavalai && kandavalai.userId !== 'BM-KA-001') {
                        console.log(`\nUpdating Kandavalai: ${kandavalai.userId} -> BM-KA-001`);
                        await col.updateOne(
                            { _id: kandavalai._id },
                            { $set: { userId: 'BM-KA-001' } }
                        );
                    }

                    // Fix Karachi to BM-KA-002
                    const karachi = results.find(r =>
                        r.branchName && r.branchName.toLowerCase().includes('karachi')
                    );

                    if (karachi && karachi.userId !== 'BM-KA-002') {
                        console.log(`Updating Karachi: ${karachi.userId} -> BM-KA-002`);
                        await col.updateOne(
                            { _id: karachi._id },
                            { $set: { userId: 'BM-KA-002' } }
                        );
                    }
                }
            } catch (e) {
                console.log(`  Collection ${colName} not found or error:`, e.message);
            }
        }

        console.log('\n✅ Fix completed!');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.close();
    }
}

fixBranchManagers();
