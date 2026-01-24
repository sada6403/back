require('dotenv').config();
const mongoose = require('mongoose');

const mongoURI = process.env.MONGO_URI || "mongodb+srv://kannan:kannan%40123@management-cluster.v2wul.mongodb.net/management_db?retryWrites=true&w=majority&appName=Management-Cluster";

const Transaction = require('./models/Transaction');
const Member = require('./models/Member');

async function backfillMemberCodes() {
    try {
        await mongoose.connect(mongoURI);
        console.log("Connected to DB");

        const transactions = await Transaction.find({ memberCode: { $exists: false } });
        console.log(`Found ${transactions.length} transactions without memberCode.`);

        let updatedCount = 0;

        for (const txn of transactions) {
            if (txn.memberId) {
                const member = await Member.findById(txn.memberId);
                if (member && member.memberId) {
                    txn.memberCode = member.memberId;
                    await txn.save();
                    process.stdout.write('.');
                    updatedCount++;
                } else {
                    console.log(`\nWarning: Member not found or has no ID for txn ${txn.billNumber}`);
                }
            }
        }

        console.log(`\n✅ Successfully updated ${updatedCount} transactions.`);

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await mongoose.disconnect();
    }
}

backfillMemberCodes();
