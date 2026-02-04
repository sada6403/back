const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
    action: { type: String, required: true }, // 'ID_CHANGE', 'BULK_IMPORT', 'BRANCH_CHANGE'
    targetUserId: { type: String }, // The user ID affected
    targetUserEmail: { type: String },

    previousUserId: { type: String }, // For ID changes
    newUserId: { type: String },

    details: { type: mongoose.Schema.Types.Mixed }, // Flexible payload
    performedBy: { type: String, default: 'SYSTEM' }, // 'SYSTEM' or Admin ID

    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);
