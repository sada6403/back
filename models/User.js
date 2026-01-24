const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true }, // e.g., BM-CO-001
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },

    role: { type: String, required: true }, // 'Branch Manager', 'Field Visitor', 'IT Sector'

    // Branch Data
    branchName: { type: String },
    branchCode: { type: String }, // 'CO', 'COL'

    status: { type: String, default: 'active', enum: ['active', 'inactive', 'suspended'] },

    // Linking to specific profile documents
    linkedEntityId: { type: mongoose.Schema.Types.ObjectId, refPath: 'roleCollection' },
    roleCollection: { type: String }, // 'FieldVisitor', 'BranchManager', 'ITSector'

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Middleware to update updatedAt
UserSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('User', UserSchema);
