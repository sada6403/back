
const mongoose = require('mongoose');
require('dotenv').config();

// Define minimal schemas to strictly query the collections
const managerSchema = new mongoose.Schema({}, { strict: false });
const fvSchema = new mongoose.Schema({}, { strict: false });
const bmSchema = new mongoose.Schema({}, { strict: false });
const employeeSchema = new mongoose.Schema({}, { strict: false });
const memberSchema = new mongoose.Schema({}, { strict: false });
const productSchema = new mongoose.Schema({}, { strict: false });

const Manager = mongoose.model('Manager', managerSchema, 'managers');
const FieldVisitor = mongoose.model('FieldVisitor', fvSchema, 'fieldvisitors');
const BranchManager = mongoose.model('BranchManager', bmSchema, 'branchmanagers');
const Employee = mongoose.model('Employee', employeeSchema, 'employees');
const Member = mongoose.model('Member', memberSchema, 'members');
const Product = mongoose.model('Product', productSchema, 'products');

const uri = process.env.MONGO_URI;

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        console.log('CONNECTED_AND_COUNTING');

        console.log('MANAGERS_COUNT: ' + await Manager.countDocuments());
        console.log('FV_COUNT: ' + await FieldVisitor.countDocuments());
        console.log('BM_COUNT: ' + await BranchManager.countDocuments());
        console.log('EMPLOYEES_COUNT: ' + await Employee.countDocuments());
        console.log('MEMBERS_COUNT: ' + await Member.countDocuments());
        console.log('PRODUCTS_COUNT: ' + await Product.countDocuments());

        process.exit(0);
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
