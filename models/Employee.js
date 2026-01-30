const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const EmployeeSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true }, // Auto-generated ID e.g. MGR-KM-000001
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    dob: { type: Date, required: true },
    role: { type: String, required: true, enum: ['manager', 'field_visitor', 'it_sector'] },
    position: { type: String }, // Optional display name
    salary: { type: Number, required: true },
    branchName: { type: String, required: true },
    branchId: { type: String }, // Generated e.g. branch-KM-001
    joinedDate: { type: Date, required: true },
    password: { type: String, required: true }, // Hashed
    status: { type: String, default: 'active' },

    // Bank Details
    bankName: { type: String, default: '' },
    bankBranch: { type: String, default: '' },
    accountNo: { type: String, default: '' },
    accountHolder: { type: String, default: '' }
}, { timestamps: true });

// Hash password before saving
EmployeeSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

EmployeeSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Employee', EmployeeSchema);
