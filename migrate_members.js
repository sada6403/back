const mongoose = require('mongoose');
require('dotenv').config();

async function migrate() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const db = mongoose.connection.db;
        const collection = db.collection('members');

        console.log('Starting migration...');

        const members = await collection.find({
            $or: [
                { contact: { $exists: false } },
                { memberId: { $exists: false } }
            ]
        }).toArray();

        console.log(`Found ${members.length} potentially inconsistent records.`);

        let contactFixed = 0;
        let idFixed = 0;
        let skipped = 0;

        for (const m of members) {
            const updates = {};
            if (!m.contact && m.mobile) {
                updates.contact = m.mobile;
            }
            if (!m.memberId && m.memberCode) {
                // Check if this memberId already exists
                const exists = await collection.findOne({ memberId: m.memberCode });
                if (!exists) {
                    updates.memberId = m.memberCode;
                } else {
                    console.log(`Skipping ID migration for ${m._id} because ${m.memberCode} already exists.`);
                    skipped++;
                }
            }

            if (Object.keys(updates).length > 0) {
                await collection.updateOne({ _id: m._id }, { $set: updates });
                if (updates.contact) contactFixed++;
                if (updates.memberId) idFixed++;
            }
        }

        console.log(`Migration completed.`);
        console.log(`- Standardized 'contact': ${contactFixed}`);
        console.log(`- Standardized 'memberId': ${idFixed}`);
        console.log(`- Skipped due to collisions: ${skipped}`);

        await mongoose.connection.close();
        process.exit(0);
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    }
}

migrate();
