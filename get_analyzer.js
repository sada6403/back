const mongoose = require('mongoose');
const fs = require('fs');

const uri = "mongodb+srv://cst23071_db_user:vgquPlo0tLETMjvK@cluster0.s8fljgu.mongodb.net/nf-farming?retryWrites=true&w=majority";

mongoose.connect(uri)
    .then(async () => {
        const db = mongoose.connection.useDb('nf-farming');
        const analyzer = await db.collection('analyzers').findOne({});
        fs.writeFileSync('analyzer_info.json', JSON.stringify(analyzer, null, 2), 'utf8');
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
