const mongoose = require('mongoose');
const uri = 'mongodb+srv://cst23071_db_user:vgquPlo0tLETMjvK@cluster0.s8fljgu.mongodb.net/nf-farming?retryWrites=true&w=majority';

console.log('Connecting...');
mongoose.connect(uri)
    .then(() => {
        console.log('DB CONNECTED SUCCESSFULLY');
        process.exit(0);
    })
    .catch(e => {
        console.error('DB CONNECTION FAILED:', e.message);
        process.exit(1);
    });
