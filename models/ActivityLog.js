const mongoose = require('mongoose');
const { formatSriLankaTime } = require('../utils/timezone');

const ActivityLogSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    username: { type: String },
    role: { type: String, index: true },
    branchName: { type: String, index: true },

    // Event information
    eventType: {
        type: String,
        required: true,
        enum: [
            'login', 'logout', 'app_open', 'app_close', 'ping_missed', 'token_expired', 'session_timeout',
            'LOGIN', 'LOGOUT', 'SCREEN_VIEW', 'REPORT_VIEW', 'REPORT_DOWNLOAD', 'DATA_VIEW', 'INVALID_ACTION_ATTEMPT'
        ],
        index: true
    },
    action: { type: String, required: true }, // Legacy field, keep for compatibility
    details: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed }, // Extra details for the event
    target: { type: String }, // ID of the object being acted upon

    // Device information
    deviceId: { type: String },
    deviceInfo: { type: String },
    platform: { type: String, enum: ['android', 'ios', 'web', 'unknown'] },

    // Network information
    ipAddress: { type: String },

    // Timestamp (stored as UTC)
    timestamp: { type: Date, required: true, default: Date.now, index: true }
}, {
    timestamps: true
});

// Compound indexes for efficient queries
ActivityLogSchema.index({ userId: 1, timestamp: -1 });
ActivityLogSchema.index({ eventType: 1, timestamp: -1 });

// Virtual getter for Sri Lanka timezone
ActivityLogSchema.virtual('timestampSL').get(function () {
    return formatSriLankaTime(this.timestamp);
});

// Include virtuals in JSON output
ActivityLogSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {
        delete ret._id;
        return ret;
    }
});

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);

