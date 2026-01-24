const mongoose = require('mongoose');
const Member = require('./models/Member');
const Employee = require('./models/Employee'); // Or ITSector etc.
const ITSector = require('./models/ITSector');
require('dotenv').config();

const checkDist = async () => {
    const uri = 'mongodb+srv://cst23071_db_user:vgquPlo0tLETMjvK@cluster0.s8fljgu.mongodb.net/nf-farming?retryWrites=true&w=majority';
    await mongoose.connect(uri);

    console.log('--- Member Dates ---');
    const members = await Member.find({}, 'registeredAt');
    const mDates = members.map(m => m.registeredAt ? m.registeredAt.toISOString().slice(0, 7) : 'None');
    const mCounts = {};
    mDates.forEach(d => mCounts[d] = (mCounts[d] || 0) + 1);
    console.log(mCounts);

    console.log('\n--- IT Sector Dates ---');
    const its = await ITSector.find({}, 'createdAt');
    const iDates = its.map(m => m.createdAt ? m.createdAt.toISOString().slice(0, 7) : 'None');
    const iCounts = {};
    iDates.forEach(d => iCounts[d] = (iCounts[d] || 0) + 1);
    console.log(iCounts);

    process.exit(0);
};

checkDist();
