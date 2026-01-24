const mongoose = require('mongoose');

const UserSessionSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    username: { type: String }, // Optional, for easier display
    role: { type: String, required: true },
    loginTime: { type: Date, required: true, default: Date.now },
    logoutTime: { type: Date },
    durationMinutes: { type: Number, default: 0 },
    ipAddress: { type: String },
    deviceInfo: { type: String }
});

module.exports = mongoose.model('UserSession', UserSessionSchema);
