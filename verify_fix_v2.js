const mongoose = require('mongoose');
require('dotenv').config();

async function verify() {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        const db = mongoose.connection.db;

        const collections = ['fieldvisitors', 'branchmanagers', 'managers', 'itsectors', 'employees'];
        console.log('--- Scanning all collections for EMP-KN-001 ---');

        for (const collName of collections) {
            const user = await db.collection(collName).findOne({ userId: 'EMP-KN-001' });
            if (user) {
                console.log(`Found in ${collName}:`);
                console.log('  Permanent Address:', user.permanentAddress);
                console.log('  Education:', user.education);
            }
        }

        console.log('\n--- Checking for any remaining swapped indicators ---');
        for (const collName of collections) {
            const issues = await db.collection(collName).find({
                permanentAddress: /BSC|Degree|Level|Diploma|Graduat/i
            }).toArray();
            if (issues.length > 0) {
                console.log(`Still ${issues.length} potential issues in ${collName}`);
            } else {
                console.log(`No issues in ${collName}.`);
            }
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

verify();
