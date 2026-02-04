const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    username: { type: String },
    role: { type: String },
    action: { type: String, required: true }, // e.g., "CREATE_EMPLOYEE", "UPDATE_MEMBER"
    details: { type: String },
    target: { type: String }, // ID of the object being acted upon
    timestamp: { type: Date, required: true, default: Date.now }
});

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);
