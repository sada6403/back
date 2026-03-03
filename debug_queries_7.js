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

    console.time('queries');
    const [managers, fieldVisitors, branchManagers, itSectors, analyzers, employees] = await Promise.all([
        Manager.find(),
        FieldVisitor.find(),
        BranchManager.find(),
        ITSector.find(),
        Analyzer.find(),
        Employee.find()
    ]);
    console.timeEnd('queries');

    process.exit(0);
}
test().catch(console.error);
