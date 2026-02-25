const mongoose = require('mongoose');

const CompanyTransferSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    userModel: { type: String, required: true }, // 'BranchManager' or 'FieldVisitor'
    userRole: { type: String, required: true }, // 'manager' or 'field_visitor'
    amount: { type: Number, required: true },
    depositorName: { type: String },
    depositorNic: { type: String },
    receiptUrl: { type: String }, // Can be base64 string or path
    status: {
        type: String,
        enum: ['pending', 'approved', 'declined', 'accepted'],
        default: 'pending',
        index: true
    },
    approvedAmount: { type: Number },
    approvedBy: { type: String },
    approvedAt: { type: Date },
    note: { type: String }
}, {
    timestamps: true,
    collection: 'companytransfers'
});

module.exports = mongoose.model('CompanyTransfer', CompanyTransferSchema);
