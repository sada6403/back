const mongoose = require('mongoose');
require('dotenv').config();
const OTP = require('./models/OTP'); // Ensure case matches file

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        console.log('Connected to DB');

        const otps = await OTP.find({}).sort({ createdAt: -1 }).limit(5);
        console.log(`Found ${otps.length} recent OTPs:`);
        otps.forEach(o => {
            console.log(`User: ${o.userId} | Email: ${o.email || 'N/A'} | Phone: ${o.phone || 'N/A'} | OTP: ${o.otp} | Time: ${o.createdAt}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

run();
