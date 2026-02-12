require('dotenv').config();
const mongoose = require('mongoose');
const Member = require('../models/Member');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/management_it');
        console.log('MongoDB Connected');
    } catch (err) {
        process.exit(1);
    }
};

const validateFinal = async () => {
    await connectDB();
    try {
        // Find one member using the MODEL (not raw collection)
        const member = await Member.findOne({});

        console.log('Final Member Validation (via Mongoose Model):');
        if (member) {
            console.log(`Name: ${member.name}`);
            console.log(`memberId: [${member.memberId}]`);
            console.log(`contact: [${member.contact}]`);
            console.log(`address: [${member.address}]`);

            // Check if memberCode alias works (if I added it to schema/methods, but here I just check if it pops up)
            console.log('Raw model object:');
            console.log(JSON.stringify(member.toObject(), null, 2));
        } else {
            console.log('No members found.');
        }

    } catch (error) {
        console.error(error);
    } finally {
        mongoose.connection.close();
    }
};

validateFinal();
