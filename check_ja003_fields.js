const mongoose = require('mongoose');
require('dotenv').config();

const FieldVisitor = require('./models/FieldVisitor');

async function checkUser() {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        const user = await FieldVisitor.findOne({ userId: 'FV-JA-003' });
        if (user) {
            console.log('User ID:', user.userId);
            console.log('Permanent Address:', user.permanentAddress);
            console.log('Education:', JSON.stringify(user.education, null, 2));
        } else {
            console.log('User FV-JA-003 not found');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkUser();
