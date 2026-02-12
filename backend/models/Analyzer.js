const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const AnalyzerSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    nic: { type: String },
    phone: { type: String, required: true },
    userId: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'analyzer' },
    status: { type: String, default: 'active' },
    branchName: { type: String, default: 'All' },
    branchId: { type: String, default: 'All' },
    joinedDate: { type: Date, default: Date.now },
}, { timestamps: true });

// Hash password before saving
AnalyzerSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

AnalyzerSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Analyzer', AnalyzerSchema);
