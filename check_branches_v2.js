const mongoose = require('mongoose');

const uri = "mongodb+srv://cst23071_db_user:vgquPlo0tLETMjvK@cluster0.s8fljgu.mongodb.net/nf-farming?retryWrites=true&w=majority";

mongoose.connect(uri)
    .then(async () => {
        // List all collections in the current database
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Collections in nf-farming:', collections.map(c => c.name));

        const targetCollections = ['transactions', 'members', 'fieldvisitors', 'branchmanagers'];

        for (const colName of targetCollections) {
            console.log(`\n--- ${colName} ---`);
            const distinctBranches = await mongoose.connection.db.collection(colName).distinct('branchName');
            console.log('Distinct branchNames:', distinctBranches);

            const distinctBranchIds = await mongoose.connection.db.collection(colName).distinct('branchId');
            console.log('Distinct branchIds:', distinctBranchIds);
        }

        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
