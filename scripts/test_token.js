const generateToken = require('../utils/generateToken');
const mongoose = require('mongoose');

// Mock data based on Kee001
const userId = new mongoose.Types.ObjectId(); // Random ID
const role = 'admin';
const branchId = 'HO-001';

try {
    console.log('Testing generateToken...');
    console.log(`Args: id=${userId}, role=${role}, branchId=${branchId}`);

    const token = generateToken(userId, role, branchId);

    console.log('✅ Token generated successfully!');
    console.log('Token prefix:', token.substring(0, 20) + '...');
} catch (error) {
    console.error('❌ Token generation failed:', error);
}
