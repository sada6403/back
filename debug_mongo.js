
const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGO_URI;
console.log('Testing connection to:', uri.replace(/:([^:@]{1,})@/, ':****@')); // Hide password in logs

mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000 // Timeout after 5s instead of 30s
})
    .then(() => {
        console.log('Successfully connected!');
        process.exit(0);
    })
    .catch(err => {
        console.error('Connection failed.');
        console.error('Error name:', err.name);
        console.error('Error message:', err.message);
        if (err.reason) console.error('Error reason:', err.reason);
        process.exit(1);
    });
