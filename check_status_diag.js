const mongoose = require('mongoose');
const BranchManager = require('./models/BranchManager');
const FieldVisitor = require('./models/FieldVisitor');
const ITSector = require('./models/ITSector');
require('dotenv').config();

async function check() {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

    const bm = await BranchManager.findOne({ userId: 'BM-JA-002' });
    const fv = await FieldVisitor.findOne({ userId: 'FV-JA-003' });
    const it = await ITSector.findOne({ userId: 'DEV-IT-2509' });

    console.log('BM-JA-002 Status:', bm ? bm.status : 'Not Found');
    console.log('FV-JA-003 Status:', fv ? fv.status : 'Not Found');
    console.log('DEV-IT-2509 Status:', it ? it.status : 'Not Found');

    process.exit(0);
}

check();
