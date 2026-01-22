const request = require('http');

const PORT = 3000;

const makeRequest = (path) => {
    return new Promise((resolve, reject) => {
        const req = request.get(`http://localhost:${PORT}/api${path}`, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve(JSON.parse(data)));
        });
        req.on('error', reject);
    });
};

const run = async () => {
    console.log('--- Debugging Data ---');
    const products = await makeRequest('/products');
    const transactions = await makeRequest('/transactions');

    console.log('\nPRODUCTS:');
    products.forEach(p => console.log(`- "${p.name}" (ID: ${p.productId})`));

    console.log('\nTRANSACTIONS:');
    // Handle array or object wrapper
    const txList = Array.isArray(transactions) ? transactions : transactions.data;

    txList.forEach(t => {
        console.log(`- Type: ${t.type}, Product: "${t.productName}" / "${t.product}", Qty: ${t.quantity}, Status: ${t.status}`);
    });
};

run();
