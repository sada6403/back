const mongoose = require('mongoose');

const OTPSchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            required: true,
            trim: true,
        },
        phone: {
            type: String,
            required: true,
            trim: true,
        },
        otp: {
            type: String,
            required: true,
        },
        purpose: {
            type: String,
            enum: ['password_reset', 'verification', 'login'],
            default: 'password_reset',
        },
        verified: {
            type: Boolean,
            default: false,
        },
        expiresAt: {
            type: Date,
            required: true,
            default: () => new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

// Create TTL index to auto-delete expired OTPs
OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for faster lookups
OTPSchema.index({ userId: 1, purpose: 1 });

module.exports = mongoose.model('OTP', OTPSchema);
