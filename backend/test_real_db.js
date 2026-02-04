const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGO_URI;
console.log('Testing URI:', uri);

mongoose.connect(uri)
    .then(() => {
        console.log('✅ Connection SUCCESS!');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Connection FAILED:', err.message);
        process.exit(1);
    });
