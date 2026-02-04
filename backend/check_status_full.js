const mongoose = require('mongoose');
const BranchManager = require('./models/BranchManager');
const FieldVisitor = require('./models/FieldVisitor');
const ITSector = require('./models/ITSector');
require('dotenv').config();

async function check() {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

    const users = [
        { id: 'BM-JA-002', model: BranchManager },
        { id: 'FV-JA-003', model: FieldVisitor },
        { id: 'DEV-IT-2509', model: ITSector }
    ];

    for (const u of users) {
        const found = await u.model.findOne({ userId: u.id });
        if (found) {
            const doc = found.toObject();
            delete doc.password;
            console.log(`--- ${u.id} ---`);
            console.log(JSON.stringify(doc, null, 2));
        } else {
            console.log(`${u.id}: Not Found`);
        }
    }

    process.exit(0);
}

check();
