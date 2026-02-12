const mongoose = require('mongoose');
require('dotenv').config();

async function inspect() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const db = mongoose.connection.db;

        // Let's find members without contact OR without memberId
        const missingFields = await db.collection('members').find({
            $or: [
                { contact: { $exists: false } },
                { memberId: { $exists: false } },
                { contact: "" },
                { memberId: "" }
            ]
        }).limit(20).toArray();

        console.log('Members with missing/empty contact or memberId:');
        missingFields.forEach(m => {
            console.log('---');
            console.log('ID:', m._id);
            console.log('Name:', m.name);
            console.log('RegisteredAt:', m.registeredAt);
            console.log('JoinedDate:', m.joinedDate);
            console.log('Contact:', m.contact);
            console.log('Mobile:', m.mobile);
            console.log('MemberId:', m.memberId);
            console.log('MemberCode:', m.memberCode);
        });

        await mongoose.connection.close();
    } catch (e) {
        console.error(e);
    }
}

inspect();
