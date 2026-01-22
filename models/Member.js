const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    date: { type: Date, default: Date.now },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['buy', 'sell'], required: true },
    description: { type: String, default: '' },
    product: { type: String, default: '' }
}, { _id: false }); // sub-document, no need for separate id usually

const MemberSchema = new mongoose.Schema({
    name: { type: String, required: true },
    contact: { type: String, required: true },
    email: { type: String, default: '' },
    dob: { type: Date },
    joinedDate: { type: Date, default: Date.now },
    totalBought: { type: Number, default: 0 },
    totalSold: { type: Number, default: 0 },
    transactions: [TransactionSchema]
});

// Virtual for 'id'
MemberSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

MemberSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) { delete ret._id }
});

module.exports = mongoose.model('Member', MemberSchema);
