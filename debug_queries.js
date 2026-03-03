require('dotenv').config();
const mongoose = require('mongoose');
const Member = require('./models/Member');
const FieldVisitor = require('./models/FieldVisitor');
const BranchManager = require('./models/BranchManager');
const ITSector = require('./models/ITSector');
const Analyzer = require('./models/Analyzer');
const Employee = require('./models/Employee');

async function test() {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log('connected');
    console.time('Member.aggregate');
    await Member.aggregate([
        { $match: { memberId: { $regex: /^L-/ } } },
        { $group: { _id: '$fieldVisitorId', count: { $sum: 1 } } }
    ]);
    console.timeEnd('Member.aggregate');

    console.time('finds');
    await Promise.all([
        FieldVisitor.find().limit(1),
        BranchManager.find().limit(1),
        ITSector.find().limit(1),
        Analyzer.find().limit(1),
        Employee.find().limit(1)
    ]);
    console.timeEnd('finds');
    process.exit(0);
}
test().catch(console.error);
