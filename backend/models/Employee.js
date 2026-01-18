const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
    // maintaining string ID to be compatible with existing frontend logic if possible,
    // though usually Mongo uses _id. We can store the custom ID as 'employeeId' or just 'id'.
    // Let's rely on the client generating the ID for now or use _id.
    // To minimize frontend changes, let's treat 'id' as a custom unique field.
    id: { type: String, required: true, unique: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    dob: { type: Date, required: true },
    position: { type: String, required: true },
    salary: { type: Number, required: true },
    branch: { type: String, required: true },
    joinedDate: { type: Date, required: true },
    bankName: { type: String, default: '' },
    bankBranch: { type: String, default: '' },
    accountNo: { type: String, default: '' },
    accountHolder: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Employee', EmployeeSchema);
