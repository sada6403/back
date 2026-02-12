require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const FieldVisitor = require('../models/FieldVisitor');

async function verify() {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const targetIds = [];
        for (let i = 1; i <= 11; i++) {
            targetIds.push(`FV-KA-${String(i).padStart(3, '0')}`);
        }

        const fvs = await FieldVisitor.find({ userId: { $in: targetIds } });
        console.log(`Found ${fvs.length} / ${targetIds.length} Field Visitors.`);

        fvs.forEach(fv => {
            console.log(`[FOUND] ${fv.userId} - ${fv.fullName} (BranchId: ${fv.branchId}, BranchName: ${fv.branchName})`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

verify();
