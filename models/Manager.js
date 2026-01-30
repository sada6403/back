const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Using the same schema structure as Employee
// Assuming the collections have similar fields (userId, fullName, email, etc.)
const ManagerSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    dob: { type: Date },
    role: { type: String, required: true }, // Should be 'Manager'
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
    accountHolder: { type: String },

    // Extended Profile
    nic: { type: String },
    civilStatus: { type: String },
    gender: { type: String },
    postalAddress: { type: String },
    permanentAddress: { type: String },
    education: { type: mongoose.Schema.Types.Mixed },
    workExperience: { type: Array },
    references: { type: Array }
}, { collection: 'managers' });

// Explicitly pointing to 'managers' collection

// Hash password before saving
ManagerSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

ManagerSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Manager', ManagerSchema);
