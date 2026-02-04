require('dotenv').config();
const mongoose = require('mongoose');
const BranchManager = require('./models/BranchManager');
const ITSector = require('./models/ITSector');
const FieldVisitor = require('./models/FieldVisitor');

const checkUser = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const username = 'Kee001';

        const manager = await BranchManager.findOne({ userId: username });
        if (manager) console.log('Found in BranchManager:', manager.role, manager.email);

        const it = await ITSector.findOne({ userId: username });
        if (it) console.log('Found in ITSector:', it.role, it.email);

        const field = await FieldVisitor.findOne({ userId: username });
        if (field) console.log('Found in FieldVisitor:', field.role, field.email);

        if (!manager && !it && !field) console.log('User NOT found in any collection');

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

checkUser();
