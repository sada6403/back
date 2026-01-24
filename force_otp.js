const mongoose = require('mongoose');
require('dotenv').config();
const ITSector = require('./models/ITSector');
const OTP = require('./models/OTP');
const { sendEmail } = require('./utils/emailService');

// Copy of verifyOTP from otpService (simplified)
const createAndSendOTP = async (userId, identifier, purpose = 'password_reset') => {
    console.log(` Generating OTP for ${userId} (${identifier})...`);
    await OTP.deleteMany({ userId, purpose });

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const isEmail = identifier.includes('@');

    const otpData = {
        userId,
        otp: otpCode,
        purpose,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    };
    if (isEmail) otpData.email = identifier;
    else otpData.phone = identifier;

    const otp = new OTP(otpData);
    await otp.save();
    console.log(` OTP Saved to DB! Code: ${otpCode}`);

    if (isEmail) {
        await sendEmail(identifier, 'Force Test OTP', `Your Force Test OTP is: ${otpCode}`);
        console.log(' Email Sent!');
    }
    return otp;
};

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        console.log('Connected to DB');

        const userId = 'DEV-IT-1108';
        const user = await ITSector.findOne({ userId });

        if (!user) {
            console.log('User not found!');
            return;
        }
        console.log(`User Found: ${user.email}`);

        await createAndSendOTP(user.userId, user.email || 'nfplantationsk@gmail.com');
        console.log('Done.');

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

run();
