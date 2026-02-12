const mongoose = require('mongoose');
const { formatSriLankaTime } = require('../utils/timezone');

const UserSessionSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    username: { type: String },
    role: { type: String, required: true, index: true },
    branchName: { type: String, index: true },
    branchId: { type: String, index: true },

    // Session tracking
    isOnline: { type: Boolean, default: true, index: true },
    sessionToken: { type: String }, // JWT token for duplicate detection

    // Timestamps (stored as UTC)
    loginTime: { type: Date, required: true, default: Date.now },
    lastPing: { type: Date, default: Date.now, index: true },
    logoutTime: { type: Date },
    durationMinutes: { type: Number, default: 0 },

    // Device information
    deviceId: { type: String, index: true },
    platform: { type: String, enum: ['android', 'ios', 'web', 'unknown'], default: 'unknown' },
    appVersion: { type: String },
    deviceInfo: { type: String },

    // Network information
    ipAddress: { type: String },

    // Optional tracking
    currentScreen: { type: String }
}, {
    timestamps: true // Adds createdAt, updatedAt
});

// Compound indexes for efficient queries
UserSessionSchema.index({ userId: 1, isOnline: -1 });
UserSessionSchema.index({ isOnline: 1, lastPing: -1 });

// Virtual getters for Sri Lanka timezone
UserSessionSchema.virtual('loginTimeSL').get(function () {
    return formatSriLankaTime(this.loginTime);
});

UserSessionSchema.virtual('lastPingSL').get(function () {
    return formatSriLankaTime(this.lastPing);
});

UserSessionSchema.virtual('logoutTimeSL').get(function () {
    return this.logoutTime ? formatSriLankaTime(this.logoutTime) : null;
});

// Include virtuals in JSON output
UserSessionSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {
        delete ret._id;
        return ret;
    }
});

module.exports = mongoose.model('UserSession', UserSessionSchema);

