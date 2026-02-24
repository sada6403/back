const mongoose = require('mongoose');

const uri = "mongodb+srv://cst23071_db_user:vgquPlo0tLETMjvK@cluster0.s8fljgu.mongodb.net/nf-farming?retryWrites=true&w=majority";

mongoose.connect(uri)
    .then(async () => {
        const db = mongoose.connection.useDb('nf-farming');
        const countTx = await db.collection('transactions').countDocuments({});
        console.log('Total Transactions in DB:', countTx);
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
