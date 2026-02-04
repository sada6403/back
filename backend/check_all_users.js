const mongoose = require('mongoose');
require('dotenv').config();

// Schemas
const userSchema = new mongoose.Schema({}, { strict: false });
const fvSchema = new mongoose.Schema({}, { strict: false });
const managerSchema = new mongoose.Schema({}, { strict: false });

const User = mongoose.model('User', userSchema, 'users');
const FieldVisitor = mongoose.model('FieldVisitor', fvSchema, 'fieldvisitors');
const Manager = mongoose.model('Manager', managerSchema, 'managers');

const uri = process.env.MONGO_URI;

mongoose.connect(uri)
    .then(async () => {
        console.log('✅ Connected to DB');

        const users = await User.countDocuments();
        const fvs = await FieldVisitor.find({}).lean();
        const managers = await Manager.find({}).lean();

        console.log(`Users (Generic): ${users}`);
        console.log(`Field Visitors: ${fvs.length}`);
        fvs.forEach(f => console.log(`  FV: ${f.name} (ID: ${f._id}, UserID: ${f.userId})`));

        console.log(`Managers: ${managers.length}`);
        managers.forEach(m => console.log(`  Mgr: ${m.name} (ID: ${m._id})`));

        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
