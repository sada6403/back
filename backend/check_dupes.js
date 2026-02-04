const mongoose = require('mongoose');
const BranchManager = require('./models/BranchManager');
const FieldVisitor = require('./models/FieldVisitor');
const ITSector = require('./models/ITSector');
const Manager = require('./models/Manager');
const Employee = require('./models/Employee');
require('dotenv').config();

async function check() {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

    const ids = ['BM-JA-002', 'FV-JA-003', 'DEV-IT-2509'];
    const models = [
        { name: 'ITSector', model: ITSector },
        { name: 'BranchManager', model: BranchManager },
        { name: 'FieldVisitor', model: FieldVisitor },
        { name: 'Manager', model: Manager },
        { name: 'Employee', model: Employee }
    ];

    for (const id of ids) {
        console.log(`Checking ID: ${id}`);
        for (const m of models) {
            const found = await m.model.findOne({ userId: id });
            if (found) {
                console.log(`  - Found in ${m.name} (Status: ${found.status})`);
            }
        }
    }

    process.exit(0);
}

check();
