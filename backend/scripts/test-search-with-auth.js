const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

const Transaction = require('../models/Transaction');

const runTest = async () => {
    const baseUrl = 'http://localhost:3001/api';

    try {
        // 1. Find a user to login
        const User = require('../models/ITSector'); // Or BranchManager
        const user = await User.findOne({ userId: 'DEV-IT-1108' }).lean();
        if (!user) {
            console.log('Test user not found');
            process.exit(1);
        }

        // We can't easily "login" without password, but we can generate a token for testing
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
            { id: user._id, role: 'it' },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        const billNumber = 'NF-B-20260205-00032';
        console.log(`\n--- Testing Search for ${billNumber} ---`);

        const response = await axios.get(`${baseUrl}/transactions`, {
            params: { billNumber },
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Status Code:', response.status);
        console.log('Success:', response.data.success);
        console.log('Results Count:', response.data.count);

        if (response.data.data && response.data.data.length > 0) {
            response.data.data.forEach((tx, i) => {
                console.log(`Result ${i + 1}: ${tx.billNumber} (Status: ${tx.status})`);
            });
        } else {
            console.log('No results returned from API.');
        }

        // 2. Test without parameters to see count
        console.log('\n--- Testing Search for ALL ---');
        const allRes = await axios.get(`${baseUrl}/transactions`, {
            params: { limit: 5 },
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('All Transactions Count:', allRes.data.count);
        if (allRes.data.data && allRes.data.data.length > 0) {
            console.log('Top result:', allRes.data.data[0].billNumber);
        }

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
