const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const BranchManager = require('../models/BranchManager');

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        console.log('Connected to DB');

        const newPasswordRaw = '1234';
        const hashedPassword = await bcrypt.hash(newPasswordRaw, 10);

        console.log('Updating passwords to "1234"...');
        const result = await BranchManager.updateMany({}, { password: hashedPassword });

        console.log(`Matched ${result.matchedCount} documents.`);
        console.log(`Updated ${result.modifiedCount} documents.`);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
