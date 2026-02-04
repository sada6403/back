const axios = require('axios');

async function checkResponse() {
    try {
        console.log('Sending POST to http://localhost:3001/api/employees/reset-password/FV-JA-003...');

        const response = await axios.post('http://localhost:3001/api/employees/reset-password/FV-JA-003');

        console.log('\n--- Response Details ---');
        console.log('Status:', response.status);
        console.log('Headers:', JSON.stringify(response.headers, null, 2));
        console.log('Body:', JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.error('\n--- Error Details ---');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Headers:', JSON.stringify(error.response.headers, null, 2));
            console.error('Body:', error.response.data);
        } else {
            console.error('Message:', error.message);
        }
    }
}

checkResponse();
