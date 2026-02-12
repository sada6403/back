require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

async function checkAndRestore() {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    const results = {
        scanTime: new Date().toISOString(),
        missingIds: [],
        foundInFieldVisitors: [],
        foundInUsers: [],
        foundInTransactions: [],
        potentialRestorabled: []
    };

    try {
        await client.connect();
        const db = client.db('nf-farming');

        const targetIds = [];
        for (let i = 1; i <= 11; i++) {
            targetIds.push(`FV-KA-${String(i).padStart(3, '0')}`);
        }
        results.targetIds = targetIds;

        // Check Field Visitors
        const fvs = await db.collection('fieldvisitors').find({
            userId: { $in: targetIds }
        }).toArray();

        results.foundInFieldVisitors = fvs.map(f => ({
            userId: f.userId,
            name: f.fullName,
            branch: f.branchName,
            status: f.status,
            isDeleted: f.isDeleted
        }));

        // Check Users
        const users = await db.collection('users').find({
            userId: { $in: targetIds }
        }).toArray();
        results.foundInUsers = users.map(u => ({
            userId: u.userId,
            role: u.role,
            username: u.username
        }));

        // Check Transactions (to see if they were active)
        // Group by fieldVisitorId
        const txs = await db.collection('transactions').aggregate([
            { $match: { fieldVisitorId: { $in: targetIds } } },
            { $group: { _id: "$fieldVisitorId", count: { $sum: 1 }, lastTx: { $max: "$date" } } }
        ]).toArray();
        results.foundInTransactions = txs;

        // Determine what is missing
        const foundFvIds = new Set(fvs.map(f => f.userId));
        results.missingIds = targetIds.filter(id => !foundFvIds.has(id));

    } catch (err) {
        results.error = err.message;
    } finally {
        await client.close();
        fs.writeFileSync(path.resolve(__dirname, 'restore_output.json'), JSON.stringify(results, null, 2));
        console.log('Check complete. Results saved to restore_output.json');
    }
}

checkAndRestore();
