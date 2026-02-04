const mongoose = require('mongoose');
require('dotenv').config();

const Manager = require('./models/Manager');
const FieldVisitor = require('./models/FieldVisitor');
const BranchManager = require('./models/BranchManager');
const ITSector = require('./models/ITSector');
const Employee = require('./models/Employee');

async function searchAll() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const targets = [/fv-001/i, /fv-002/i];

        const models = { Manager, FieldVisitor, BranchManager, ITSector, Employee };

        for (const [name, model] of Object.entries(models)) {
            for (const t of targets) {
                const results = await model.find({ userId: t });
                if (results.length > 0) {
                    console.log(`Found in ${name}:`);
                    results.forEach(r => {
                        console.log(`  ID: ${r.userId}, Name: ${r.name || r.fullName}, Pass: ${r.password ? 'Has Hash' : 'MISSING'}`);
                    });
                }
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
    }
}

searchAll();
