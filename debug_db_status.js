const mongoose = require('mongoose');
const uri = 'mongodb+srv://cst23071_db_user:vgquPlo0tLETMjvK@cluster0.s8fljgu.mongodb.net/nf-farming?retryWrites=true&w=majority';

async function check() {
    try {
        await mongoose.connect(uri);
        const cols = await mongoose.connection.db.listCollections().toArray();
        const names = cols.map(c => c.name);
        console.log('COLLECTIONS:', JSON.stringify(names));

        for (const name of names) {
            const count = await mongoose.connection.db.collection(name).countDocuments();
            console.log(`${name}: ${count}`);
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
