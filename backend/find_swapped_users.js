const mongoose = require('mongoose');
require('dotenv').config();

const FieldVisitor = require('./models/FieldVisitor');
const BranchManager = require('./models/BranchManager');

async function findSwapped() {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        const models = [FieldVisitor, BranchManager];

        for (const model of models) {
            const users = await model.find({ permanentAddress: /BSC/i });
            if (users.length > 0) {
                console.log(`Found ${users.length} users with BSC in permanentAddress in ${model.modelName}`);
                users.forEach(u => {
                    console.log(`- ${u.userId}: ${u.fullName}`);
                    console.log(`  PermAddr: ${u.permanentAddress}`);
                    console.log(`  Education: ${JSON.stringify(u.education)}`);
                });
            }
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

findSwapped();
