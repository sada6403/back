const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const db = mongoose.connection.db;
        const total = await db.collection('members').countDocuments();
        const hasContact = await db.collection('members').countDocuments({ contact: { $exists: true, $ne: null } });
        const hasMobile = await db.collection('members').countDocuments({ mobile: { $exists: true, $ne: null } });
        const hasMemberId = await db.collection('members').countDocuments({ memberId: { $exists: true, $ne: null } });
        const hasMemberCode = await db.collection('members').countDocuments({ memberCode: { $exists: true, $ne: null } });

        console.log('Total Members:', total);
        console.log('Members with "contact":', hasContact);
        console.log('Members with "mobile":', hasMobile);
        console.log('Members with "memberId":', hasMemberId);
        console.log('Members with "memberCode":', hasMemberCode);

        const sampleInconsistent = await db.collection('members').findOne({
            $or: [
                { contact: { $exists: false } },
                { memberId: { $exists: false } }
            ]
        });

        if (sampleInconsistent) {
            console.log('\nSample Inconsistent Record:');
            console.log(JSON.stringify(sampleInconsistent, null, 2));
        }

        await mongoose.connection.close();
    } catch (e) {
        console.error(e);
    }
}

check();
