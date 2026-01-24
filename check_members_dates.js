const mongoose = require('mongoose');
const Member = require('./models/Member');
require('dotenv').config();

const checkDates = async () => {
    const uri = 'mongodb+srv://cst23071_db_user:vgquPlo0tLETMjvK@cluster0.s8fljgu.mongodb.net/nf-farming?retryWrites=true&w=majority';
    await mongoose.connect(uri);

    console.log('--- Current Member Dates ---');
    const members = await Member.find({});

    const output = members.map(m => ({
        name: m.name,
        registeredAt: m.registeredAt,
        joinedDate: m.joinedDate,
        raw_id: m._id
    }));

    const fs = require('fs');
    fs.writeFileSync('member_dates_clean.json', JSON.stringify(output, null, 2));
    console.log('Written to member_dates_clean.json');
    process.exit(0);
};

checkDates();
