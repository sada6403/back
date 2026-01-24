const mongoose = require('mongoose');

const BranchManagerSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    dob: { type: Date },
    role: { type: String, required: true }, // Should be 'Branch Manager' (if that's the role name logic uses)
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
}, { collection: 'branchmanagers' });

module.exports = mongoose.model('BranchManager', BranchManagerSchema);
