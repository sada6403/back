const OTP = require('../models/OTP');
const sendSMS = require('./smsService');

const { sendEmail } = require('./emailService');

// Generate a random 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Create and send OTP to user (supports phone or email)
const createAndSendOTP = async (userId, identifier, purpose = 'password_reset') => {
    try {
        // Delete any existing OTPs for this user and purpose
        await OTP.deleteMany({ userId, purpose });

        // Generate new OTP
        const otpCode = generateOTP();
        const isEmail = identifier.includes('@');

        // Create OTP record
        const otpData = {
            userId,
            otp: otpCode,
            purpose,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        };

        if (isEmail) {
            otpData.email = identifier;
        } else {
            otpData.phone = identifier;
        }

        const otp = new OTP(otpData);
        await otp.save();

        if (isEmail) {
            const subject = `Your OTP for ${purpose.replace('_', ' ')}`;
            const html = `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>Your OTP Code</h2>
                    <p>Your OTP code is: <strong style="font-size: 24px;">${otpCode}</strong></p>
                    <p>This code is valid for 5 minutes.</p>
                </div>
             `;
            await sendEmail(identifier, subject, html);
        } else {
            // Send SMS
            const message = `Your NF Farming ${purpose.replace('_', ' ')} OTP is: ${otpCode}. Valid for 5 minutes.`;
            await sendSMS(identifier, message);
        }

        return {
            success: true,
            message: `OTP sent to ${isEmail ? 'email' : 'mobile'} successfully`,
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
