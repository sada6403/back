const mongoose = require('mongoose');
const Transaction = require('./models/Transaction');
const Member = require('./models/Member');
require('dotenv').config();

const cleanup = async () => {
    const uri = 'mongodb+srv://cst23071_db_user:vgquPlo0tLETMjvK@cluster0.s8fljgu.mongodb.net/nf-farming?retryWrites=true&w=majority';
    await mongoose.connect(uri);

    console.log('Fetching all transactions...');
    const allTxns = await Transaction.find({});
    console.log(`Total transactions found: ${allTxns.length}`);

    let deletedCount = 0;

    for (const txn of allTxns) {
        if (!txn.memberId) {
            console.log(`Deleting txn ${txn._id} (No memberId)`);
            await Transaction.deleteOne({ _id: txn._id });
            deletedCount++;
            continue;
        }

        const memberExists = await Member.findById(txn.memberId);
        if (!memberExists) {
            console.log(`Deleting txn ${txn._id} (Member ${txn.memberId} not found)`);
            await Transaction.deleteOne({ _id: txn._id });
            deletedCount++;
        }
    }

    console.log(`Cleanup complete. Deleted ${deletedCount} orphaned transactions.`);
    process.exit(0);
};

cleanup();
