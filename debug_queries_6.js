require('dotenv').config();
const mongoose = require('mongoose');
const BranchManager = require('./models/BranchManager');
const Employee = require('./models/Employee');

async function test() {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log('connected');

    console.time('BranchManager.find() NO LEAN');
    await BranchManager.find();
    console.timeEnd('BranchManager.find() NO LEAN');

    console.time('BranchManager.find().lean()');
    await BranchManager.find().lean();
    console.timeEnd('BranchManager.find().lean()');

    console.time('Employee.find() NO LEAN');
    await Employee.find();
    console.timeEnd('Employee.find() NO LEAN');

    console.time('Employee.find().lean()');
    await Employee.find().lean();
    console.timeEnd('Employee.find().lean()');

    process.exit(0);
}
test().catch(console.error);
