const axios = require('axios');

async function testAddProduct() {
    try {
        const response = await axios.post('http://192.168.8.100:3001/api/products', {
            name: "Test Product " + Date.now(),
            defaultPrice: 100,
            buyingPrice: 80,
            unit: "Kg",
            description: "Test description"
        });
        console.log('Success:', response.data);
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

testAddProduct();
