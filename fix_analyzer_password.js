const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const Analyzer = require('./models/Analyzer');

async function fixAnalyzerPassword() {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        console.log('Connected to DB');

        const email = 'nfplantation31@gmail.com';
        const rawPassword = 'Safna@31';

        // Find existing user
        let user = await Analyzer.findOne({ email });

        if (user) {
            console.log('Updating existing analyzer password...');
            user.password = rawPassword; // The pre-save hook should hash this
            await user.save();
            console.log('Password updated and hashed.');
        } else {
            console.log('Analyzer not found, creating new one...');
            user = new Analyzer({
                fullName: 'Hussain Fathima Safna',
                email: email,
                phone: '0763249033',
                password: rawPassword,
                role: 'Analyzer',
                status: 'active',
                userId: 'AZ' + Date.now().toString().slice(-6)
            });
            await user.save();
            console.log('New analyzer created with hashed password.');
        }

        // Verify hashing worked by trying to match
        const verifiedUser = await Analyzer.findOne({ email });
        const isMatch = await verifiedUser.matchPassword(rawPassword);
        console.log('Verification match check:', isMatch ? 'SUCCESS' : 'FAILED');

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

fixAnalyzerPassword();
