const mongoose = require('mongoose');

const uri = "mongodb+srv://cst23071_db_user:vgquPlo0tLETMjvK@cluster0.s8fljgu.mongodb.net/nf-farming?retryWrites=true&w=majority";

mongoose.connect(uri)
    .then(async () => {
        const db = mongoose.connection.useDb('nf-farming');

        console.log('--- Checking Branch Names ---');

        const collections = ['transactions', 'members', 'fieldvisitors', 'branchmanagers'];
        for (const coll of collections) {
            const branches = await db.collection(coll).distinct('branchName');
            console.log(`Branches in ${coll}:`, branches);
        }

        const counts = await db.collection('transactions').aggregate([
            { $group: { _id: "$branchName", count: { $sum: 1 } } }
        ]).toArray();
        console.log('Transaction counts by branch:', counts);

        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
