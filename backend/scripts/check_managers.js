require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const BranchManager = require('../models/BranchManager');

async function checkManagers() {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const branchesToCheck = ['BR-KA-001', 'BR-KA-002'];
        const managers = await BranchManager.find({});

        console.log(`Total Managers: ${managers.length}`);
        managers.forEach(m => {
            console.log(`Manager: ${m.fullName} (${m.userId}) - BranchId: "${m.branchId}" - BranchName: "${m.branchName}"`);
        });

        const targetManagers = await BranchManager.find({ branchId: { $in: branchesToCheck } });
        console.log(`\nFound matching managers for ${branchesToCheck}: ${targetManagers.length}`);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

checkManagers();
