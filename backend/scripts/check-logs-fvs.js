require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { MongoClient } = require('mongodb');

async function checkLogs() {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('nf-farming');

        const targetIds = [];
        for (let i = 1; i <= 11; i++) {
            targetIds.push(`FV-KA-${String(i).padStart(3, '0')}`);
        }

        console.log('Checking logs for:', targetIds);

        // Check Audit Logs
        // Assuming structure often has 'entityId' or 'details' containing the ID
        const audits = await db.collection('auditlogs').find({
            $or: [
                { entityId: { $in: targetIds } },
                { description: { $regex: targetIds.join('|') } },
                { "details.userId": { $in: targetIds } }
            ]
        }).toArray();

        console.log(`Found ${audits.length} audit logs.`);
        audits.forEach(l => console.log(`Audit: ${l.action} - ${l.entityId} - ${l.timestamp}`));

        // Check Activity Logs
        const activities = await db.collection('activitylogs').find({
            $or: [
                { userId: { $in: targetIds } },
                { description: { $regex: targetIds.join('|') } }
            ]
        }).toArray();
        console.log(`Found ${activities.length} activity logs.`);
        activities.forEach(l => console.log(`Activity: ${l.action} - ${l.userId} - ${l.timestamp}`));

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

checkLogs();
