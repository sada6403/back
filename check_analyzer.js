const mongoose = require('mongoose');
require('dotenv').config();
const Analyzer = require('./models/Analyzer');

mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI)
    .then(async () => {
        console.log('Connected to DB');
        const user = await Analyzer.findOne({ email: 'nfplantation31@gmail.com' });
        if (user) {
            console.log('User Found:');
            console.log('Full Name:', user.fullName);
            console.log('Email:', user.email);
            console.log('Role:', user.role);
            console.log('Status:', user.status);
            // We won't log the password for security, but we can check if it exists
            console.log('Password Hash Exists:', !!user.password);
        } else {
            console.log('User NOT found with email nfplantation31@gmail.com');
            const allAnalyzers = await Analyzer.find({});
            console.log('All Analyzers in DB:', allAnalyzers.map(a => a.email));
        }
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
