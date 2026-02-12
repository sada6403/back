const axios = require('axios');

async function testPasswordReset() {
    try {
        console.log('Testing password reset for FV-KM-001...');

        const response = await axios.post('http://localhost:3001/api/employees/reset-password/FV-KM-001');

        console.log('\n✅ Password Reset Successful!');
        console.log('Response:', JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.error('\n❌ Error:', error.response?.data || error.message);

        if (error.code === 'ECONNREFUSED') {
            console.error('\n⚠️  Server is not running on port 3000');
            console.error('Please make sure the backend server is running with: npm run dev');
        }
    }
}

testPasswordReset();
