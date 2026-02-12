const axios = require('axios');

const testSearch = async () => {
    const baseUrl = 'http://localhost:3001/api';
    const billNumber = 'NF-B-20260205-00032';

    try {
        console.log(`Testing search for: ${billNumber}`);
        const response = await axios.get(`${baseUrl}/transactions`, {
            params: { billNumber }
        });

        console.log('Response Success:', response.data.success);
        console.log('Count:', response.data.count);
        if (response.data.data && response.data.data.length > 0) {
            console.log('First Result Bill Number:', response.data.data[0].billNumber);
        } else {
            console.log('No results found.');
        }
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) console.error('Data:', error.response.data);
    }
};

testSearch();
