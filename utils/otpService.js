const OTP = require('../models/OTP');
const sendSMS = require('./smsService');

// Generate a random 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Create and send OTP to user
const createAndSendOTP = async (userId, phone, purpose = 'password_reset') => {
    try {
        // Delete any existing OTPs for this user and purpose
        await OTP.deleteMany({ userId, purpose });

        // Generate new OTP
        const otpCode = generateOTP();

        // Create OTP record
        const otp = new OTP({
            userId,
            phone,
            otp: otpCode,
            purpose,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        });

        await otp.save();

        // Send SMS
        const message = `Your NF Farming ${purpose.replace('_', ' ')} OTP is: ${otpCode}. Valid for 5 minutes.`;
        await sendSMS(phone, message);

        return {
            success: true,
            message: 'OTP sent successfully',
            expiresAt: otp.expiresAt,
        };
    } catch (error) {
        console.error('Error creating and sending OTP:', error);
        throw error;
    }
};

// Verify OTP
const verifyOTP = async (userId, otpCode, purpose = 'password_reset') => {
    try {
        // Find the OTP
        const otp = await OTP.findOne({
            userId,
            otp: otpCode,
            purpose,
            verified: false,
        });

        if (!otp) {
            return {
                success: false,
                message: 'Invalid OTP code',
            };
        }

        // Check if expired
        if (new Date() > otp.expiresAt) {
            await OTP.deleteOne({ _id: otp._id });
            return {
                success: false,
                message: 'OTP has expired',
            };
        }

        // Mark as verified
        otp.verified = true;
        await otp.save();

        return {
            success: true,
            message: 'OTP verified successfully',
            otpId: otp._id,
        };
    } catch (error) {
        console.error('Error verifying OTP:', error);
        throw error;
    }
};

// Clean up expired OTPs (optional - TTL index handles this automatically)
const cleanupExpiredOTPs = async () => {
    try {
        const result = await OTP.deleteMany({
            expiresAt: { $lt: new Date() },
        });
        console.log(`Cleaned up ${result.deletedCount} expired OTPs`);
        return result.deletedCount;
    } catch (error) {
        console.error('Error cleaning up OTPs:', error);
        throw error;
    }
};

module.exports = {
    generateOTP,
    createAndSendOTP,
    verifyOTP,
    cleanupExpiredOTPs,
};
