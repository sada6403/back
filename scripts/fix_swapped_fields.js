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

            // We look for users where permanentAddress looks like education or vice versa
            // Common education indicator: BSC, degree, educational terms
            // Common address indicators: road, street, st, no, lane, village
            const potentialSwapped = await model.find({
                $or: [
                    { permanentAddress: /BSC|Degree|Level|Diploma|Graduat/i },
                    { education: /Road|Street|Lane|Village|No:|No\./i }
                ]
            });

            if (potentialSwapped.length > 0) {
                console.log(`Found ${potentialSwapped.length} potentially swapped users in ${model.modelName}`);

                for (const user of potentialSwapped) {
                    const oldAddr = user.permanentAddress || '';
                    const oldEdu = typeof user.education === 'string' ? user.education : JSON.stringify(user.education);

                    // Refined check: Swap only if it looks highly likely
                    // Case 1: PermAddr is clearly a degree and Edu is empty or looks like an address
                    const addrIsEdu = /BSC|Degree|Level|Diploma/i.test(oldAddr);
                    const eduIsAddr = /Road|Street|Lane|Village|No:|No\./i.test(oldEdu);

                    if (addrIsEdu || eduIsAddr) {
                        console.log(`Swapping fields for: ${user.userId} (${user.fullName})`);
                        console.log(`  Current Address: ${oldAddr}`);
                        console.log(`  Current Education: ${oldEdu}`);

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
