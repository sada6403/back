const mongoose = require('mongoose');
require('dotenv').config();
const OTP = require('./models/OTP');

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

        const otps = await OTP.find({});
        console.log(`Total OTPs: ${otps.length}`);
        otps.forEach(o => {
            console.log(`User: '${o.userId}' | Email: ${o.email} | OTP: ${o.otp} | Created: ${o.createdAt}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

run();
