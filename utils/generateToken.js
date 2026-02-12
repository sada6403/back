const jwt = require('jsonwebtoken');

const generateToken = (id, role, branchId) => {
    return jwt.sign({ id, role, branchId }, process.env.JWT_SECRET || 'nf_farming_secret_2024', {
        expiresIn: '30d',
    });
};

module.exports = generateToken;
