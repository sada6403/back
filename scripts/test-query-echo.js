const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

const runTest = async () => {
    const baseUrl = 'http://localhost:3001/api';

    try {
        const User = require('../models/ITSector');
        const user = await User.findOne({ userId: 'DEV-IT-1108' }).lean();
        if (!user) {
            console.log('Test user not found');
            process.exit(1);
        }

        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
            { id: user._id, role: 'it' },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        const billNumber = 'NF-B-20260205-00032';
        console.log(`\n--- Testing Query Echo for ${billNumber} ---`);

        const response = await axios.get(`${baseUrl}/transactions/debug/query-echo`, {
            params: { billNumber },
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Query received by server:', JSON.stringify(response.data.query, null, 2));
        console.log('User detected:', JSON.stringify(response.data.user, null, 2));
        console.log('Full URL:', response.data.url);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
        process.exit(1);
    } finally {
        mongoose.connection.close();
    }
};

mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI)
    .then(runTest);
