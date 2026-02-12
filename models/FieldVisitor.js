const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
    backupPassword: { type: String },
    bankName: { type: String },
    bankBranch: { type: String },
    accountNo: { type: String },
    accountHolder: { type: String },

    // Extended Profile
    assignedArea: { type: String, default: '' },
    nic: { type: String },
    civilStatus: { type: String },
    gender: { type: String },
    postalAddress: { type: String },
    permanentAddress: { type: String },
    education: { type: mongoose.Schema.Types.Mixed }, // String or Object
    workExperience: { type: Array },
    references: { type: Array }
}, { collection: 'fieldvisitors' });

// Hash password before saving
FieldVisitorSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

FieldVisitorSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('FieldVisitor', FieldVisitorSchema);
