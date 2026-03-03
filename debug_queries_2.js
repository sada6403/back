require('dotenv').config();
const mongoose = require('mongoose');
const FieldVisitor = require('./models/FieldVisitor');
const BranchManager = require('./models/BranchManager');
const ITSector = require('./models/ITSector');
const Analyzer = require('./models/Analyzer');
const Employee = require('./models/Employee');
const Manager = require('./models/Manager');

async function test() {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log('connected');

    const models = [
        { name: 'FieldVisitor', model: FieldVisitor },
        { name: 'BranchManager', model: BranchManager },
        { name: 'ITSector', model: ITSector },
        { name: 'Analyzer', model: Analyzer },
        { name: 'Employee', model: Employee },
        { name: 'Manager', model: Manager }
    ];

    for (let { name, model } of models) {
        console.time(name);
        await model.find().limit(1);
        console.timeEnd(name);
    }

    process.exit(0);
}
test().catch(console.error);
