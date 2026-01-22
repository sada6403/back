const mongoose = require('mongoose');

const FieldVisitorSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    dob: { type: Date },
    role: { type: String, required: true }, // Should be 'Field Visitor'
    position: { type: String },
    salary: { type: Number, required: true },
    branchName: { type: String, required: true },
    branchId: { type: String },
    joinedDate: { type: Date, default: Date.now },
    password: { type: String, required: true },
    status: { type: String, default: 'active' },
    bankName: { type: String },
    bankBranch: { type: String },
    accountNo: { type: String },
    accountHolder: { type: String }
}, { collection: 'fieldvisitors' });

module.exports = mongoose.model('FieldVisitor', FieldVisitorSchema);
