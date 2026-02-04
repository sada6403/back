const mongoose = require('mongoose');
require('dotenv').config();

const FieldVisitor = require('./models/FieldVisitor');

async function checkUser() {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        console.log('DB Connected');

        const user = await FieldVisitor.findOne({ userId: 'FV-KM-001' });
        if (user) {
            console.log('User found:', JSON.stringify(user, null, 2));
        } else {
            // Try generic search in fieldvisitors collection
            const rawUser = await mongoose.connection.db.collection('fieldvisitors').findOne({ userId: 'FV-KM-001' });
            console.log('Raw user from collection:', JSON.stringify(rawUser, null, 2));
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkUser();
