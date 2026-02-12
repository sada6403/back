require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/management_it');
        console.log('MongoDB Connected');
    } catch (err) {
        process.exit(1);
    }
};

const migrateMembers = async () => {
    await connectDB();

    let log = "Migration Log\n=============\n";
    try {
        const collection = mongoose.connection.collection('members');

        const members = await collection.find({ memberCode: { $exists: true } }).toArray();
        log += `Found ${members.length} members with memberCode\n`;

        let successCount = 0;
        let skipCount = 0;
        let errorCount = 0;

        for (const m of members) {
            try {
                // If memberId is already there and NOT empty string, skip
                if (m.memberId && m.memberId !== "") {
                    skipCount++;
                    continue;
                }

                // Prepare update
                const update = { $set: { memberId: m.memberCode }, $unset: { memberCode: "" } };

                // If contact is missing and mobile exists, fix that too
                if ((!m.contact || m.contact === "") && m.mobile) {
                    update.$set.contact = m.mobile;
                    update.$unset.mobile = "";
                }

                await collection.updateOne({ _id: m._id }, update);
                successCount++;
            } catch (err) {
                log += `Error migrating ${m.name} (Code: ${m.memberCode}): ${err.message}\n`;
                errorCount++;
            }
        }

        log += `\nResults: ${successCount} success, ${skipCount} skipped, ${errorCount} errors.\n`;

    } catch (error) {
        log += `Critical Migration Error: ${error.message}\n`;
    } finally {
        fs.writeFileSync('migration_log.txt', log);
        mongoose.connection.close();
        console.log('Done. Check migration_log.txt');
    }
};

migrateMembers();
