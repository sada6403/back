const mongoose = require('mongoose');
const Member = require('./models/Member');
const ITSector = require('./models/ITSector');
const BranchManager = require('./models/BranchManager');
const FieldVisitor = require('./models/FieldVisitor');
require('dotenv').config();

const randomDate = (start, end) => {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

const distribute = async () => {
    const uri = 'mongodb+srv://cst23071_db_user:vgquPlo0tLETMjvK@cluster0.s8fljgu.mongodb.net/nf-farming?retryWrites=true&w=majority';
    await mongoose.connect(uri);

    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 5);

    console.log('--- Distributing Member Dates ---');
    const members = await Member.find({});
    for (let m of members) {
        const newDate = randomDate(sixMonthsAgo, now);
        // Direct DB update to bypass schema validation
        await Member.updateOne(
            { _id: m._id },
            {
                $set: { registeredAt: newDate, joinedDate: newDate }
            });
        console.log(`Member ${m.name} -> ${newDate.toISOString().slice(0, 7)}`);
    }

    console.log('\n--- Distributing IT Sector Dates ---');
    const its = await ITSector.find({});
    for (let u of its) {
        const newDate = randomDate(sixMonthsAgo, now);
        await ITSector.updateOne(
            { _id: u._id },
            { $set: { createdAt: newDate, joinedDate: newDate } }
        );
        console.log(`IT ${u.fullName} -> ${newDate.toISOString().slice(0, 7)}`);
    }

    console.log('\n--- Distributing Field Visitor Dates ---');
    const fvs = await FieldVisitor.find({});
    for (let f of fvs) {
        const newDate = randomDate(sixMonthsAgo, now);
        await FieldVisitor.updateOne(
            { _id: f._id },
            { $set: { createdAt: newDate } }
        );
        console.log(`FV ${f.fullName} -> ${newDate.toISOString().slice(0, 7)}`);
    }

    console.log('Done. Dates distributed.');
    process.exit(0);
};

distribute();
