const mongoose = require('mongoose');
const Member = require('./models/Member');
require('dotenv').config();

const checkFields = async () => {
    const uri = 'mongodb+srv://cst23071_db_user:vgquPlo0tLETMjvK@cluster0.s8fljgu.mongodb.net/nf-farming?retryWrites=true&w=majority';
    await mongoose.connect(uri);

    const member = await Member.findOne().lean();
    console.log('Sample Member Fields:', Object.keys(member));
    console.log('joinedDate:', member.joinedDate);
    console.log('registeredAt:', member.registeredAt);

    process.exit(0);
};

checkFields();
