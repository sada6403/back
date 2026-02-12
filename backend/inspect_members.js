const mongoose = require('mongoose');
require('dotenv').config();

async function inspect() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const members = await mongoose.connection.db.collection('members').find({}).sort({ joinedDate: -1 }).limit(10).toArray();

        console.log('Last 10 members:');
        members.forEach(m => {
            console.log(JSON.stringify({
                _id: m._id,
                name: m.name,
                memberId: m.memberId,
                contact: m.contact,
                mobile: m.mobile, // Check if this exists accidentally
                nic: m.nic,
                memberCode: m.memberCode // Check if this exists accidentally
            }, null, 2));
        });

        await mongoose.connection.close();
    } catch (e) {
        console.error(e);
    }
}

inspect();
