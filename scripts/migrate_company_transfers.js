const mongoose = require('mongoose');
require('dotenv').config();

async function migrateTransfers() {
    try {
        console.log('Starting migration...');
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        const collection = mongoose.connection.db.collection('companytransfers');

        const result = await collection.updateMany(
            { submittedBy: { $exists: true } },
            [
                {
                    $set: {
                        userId: "$submittedBy",
                        amount: "$submittedAmount",
                        userRole: { $toLower: "$submitterRole" },
                        depositorName: "$submitterName",
                        depositorNic: "$submitterNic",
                        receiptUrl: "$imageUrl",
                        userModel: {
                            $cond: {
                                if: { $eq: [{ $toLower: "$submitterRole" }, "manager"] },
                                then: "BranchManager",
                                else: "FieldVisitor"
                            }
                        }
                    }
                },
                {
                    $unset: [
                        "submittedBy",
                        "submittedAmount",
                        "submitterRole",
                        "submitterName",
                        "submitterNic",
                        "imageUrl"
                    ]
                }
            ]
        );

        console.log(`Migration completed. Modified ${result.modifiedCount} documents.`);
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrateTransfers();
