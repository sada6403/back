require('dotenv').config();
const mongoose = require('mongoose');
const Manager = require('./models/Manager');
const FieldVisitor = require('./models/FieldVisitor');
const BranchManager = require('./models/BranchManager');
const ITSector = require('./models/ITSector');
const Analyzer = require('./models/Analyzer');
const Employee = require('./models/Employee');

async function test() {
    console.time('connect');
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.timeEnd('connect');

    console.log('starting queries...');
    const queries = [
        Manager.find().then(() => console.log('Manager done')),
        FieldVisitor.find().then(() => console.log('FieldVisitor done')),
        BranchManager.find().then(() => console.log('BranchManager done')),
        ITSector.find().then(() => console.log('ITSector done')),
        Analyzer.find().then(() => console.log('Analyzer done')),
        Employee.find().then(() => console.log('Employee done')),
    ];

    await Promise.all(queries);
    console.log('all done');
    process.exit(0);
}
test().catch(console.error);
