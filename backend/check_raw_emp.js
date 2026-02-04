const mongoose = require('mongoose');
require('dotenv').config();

async function checkRaw() {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        const db = mongoose.connection.db;
        const employee = await db.collection('employees').findOne({ userId: 'EMP-KN-001' });
        console.log('Raw Document for EMP-KN-001:', JSON.stringify(employee, null, 2));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkRaw();
