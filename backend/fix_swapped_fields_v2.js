const mongoose = require('mongoose');
require('dotenv').config();

const FieldVisitor = require('./models/FieldVisitor');
const BranchManager = require('./models/BranchManager');
const Manager = require('./models/Manager');
const ITSector = require('./models/ITSector');
const Employee = require('./models/Employee');

async function fixSwappedFields() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

        const models = [FieldVisitor, BranchManager, Manager, ITSector, Employee];
        let totalFixed = 0;

        for (const model of models) {
            console.log(`Checking ${model.modelName} collection...`);

            const victims = await model.find({
                $or: [
                    { permanentAddress: /BSC|Degree|Level|Diploma|Graduat/i },
                    { education: /Road|Street|Lane|Village|No:|No\./i }
                ]
            });

            if (victims.length > 0) {
                console.log(`Found ${victims.length} potentially swapped users in ${model.modelName}`);

                for (const user of victims) {
                    const oldAddr = user.permanentAddress || '';
                    const oldEdu = typeof user.education === 'string' ? user.education : JSON.stringify(user.education);

                    const addrIsEdu = /BSC|Degree|Level|Diploma/i.test(oldAddr);
                    const eduIsAddr = /Road|Street|Lane|Village|No:|No\./i.test(oldEdu);

                    if (addrIsEdu || eduIsAddr) {
                        console.log(`Swapping fields for: ${user.userId} (${user.fullName})`);

                        const temp = user.permanentAddress;
                        user.permanentAddress = user.education;
                        user.education = temp;

                        await user.save();
                        totalFixed++;
                        console.log('  -> FIXED');
                    }
                }
            }
        }

        console.log(`\nMigration complete. Total records fixed: ${totalFixed}`);

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await mongoose.disconnect();
    }
}

fixSwappedFields();
