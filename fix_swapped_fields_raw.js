const mongoose = require('mongoose');
require('dotenv').config();

async function fixSwappedFields() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        const db = mongoose.connection.db;

        const collections = ['fieldvisitors', 'branchmanagers', 'managers', 'itsectors', 'employees'];
        let totalFixed = 0;

        for (const collName of collections) {
            console.log(`Checking ${collName} collection...`);
            const collection = db.collection(collName);

            const victims = await collection.find({
                $or: [
                    { permanentAddress: /BSC|Degree|Level|Diploma|Graduat/i },
                    { education: /Road|Street|Lane|Village|No:|No\./i }
                ]
            }).toArray();

            if (victims.length > 0) {
                console.log(`Found ${victims.length} potentially swapped users in ${collName}`);

                for (const user of victims) {
                    const oldAddr = user.permanentAddress || '';
                    const oldEdu = typeof user.education === 'string' ? user.education : JSON.stringify(user.education);

                    const addrIsEdu = /BSC|Degree|Level|Diploma/i.test(oldAddr);
                    const eduIsAddr = /Road|Street|Lane|Village|No:|No\./i.test(oldEdu);

                    if (addrIsEdu || eduIsAddr) {
                        console.log(`Swapping fields for: ${user.userId || 'NoID'} (${user.fullName || user.name})`);

                        await collection.updateOne(
                            { _id: user._id },
                            {
                                $set: {
                                    permanentAddress: user.education,
                                    education: user.permanentAddress
                                }
                            }
                        );
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
