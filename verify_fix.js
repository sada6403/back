const mongoose = require('mongoose');
require('dotenv').config();

async function verify() {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        const db = mongoose.connection.db;
        const user = await db.collection('employees').findOne({ userId: 'EMP-KN-001' });

        console.log('--- Verification for EMP-KN-001 ---');
        console.log('Permanent Address:', user.permanentAddress);
        console.log('Education:', user.education);

        // Final check for others
        const collections = ['fieldvisitors', 'branchmanagers', 'managers', 'itsectors', 'employees'];
        for (const collName of collections) {
            const others = await db.collection(collName).find({
                permanentAddress: /BSC|Degree|Level|Diploma|Graduat/i
            }).toArray();
            if (others.length > 0) {
                console.log(`Still found ${others.length} issues in ${collName}`);
            }
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

verify();
