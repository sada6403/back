const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ITSectorSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        phone: {
            type: String,
            required: true,
            trim: true,
        },
        branchName: {
            type: String,
            default: 'Head Office',
        },
        branchId: {
            type: String,
            default: 'HO-001',
        },
        userId: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        password: {
            type: String,
            required: true,
        },
        role: {
            type: String,
            default: 'it_sector',
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
        },
        hasChangedPassword: {
            type: Boolean,
            default: false,
        },
        address: { type: String, default: '' },
        bankAccount: { type: String, default: '' },
        nic: { type: String, default: '' },
        civilStatus: { type: String, default: '' },
        postalAddress: { type: String, default: '' },
        permanentAddress: { type: String, default: '' },
        education: { type: String, default: '' },

        // Bank Details
        bankName: { type: String, default: '' },
        bankBranch: { type: String, default: '' },
        accountNo: { type: String, default: '' },
        accountHolder: { type: String, default: '' },

        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

// Hash password before saving
ITSectorSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

ITSectorSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('ITSector', ITSectorSchema);
