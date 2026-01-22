const request = require('http');

// Config
const PORT = 3000;

const makeRequest = (path, method, body) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: PORT,
            path: `/api${path}`,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = request.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve({ status: res.statusCode, body: json });
                } catch (e) {
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });

        req.on('error', (e) => reject(e));
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
};

const runTest = async () => {
    try {
        console.log('--- Stock Logic Verification (API Only) ---');

        // 1. Get List of Products to find one to test
        console.log('Fetching Products...');
        const productsRes = await makeRequest('/products', 'GET');

        let testProduct;

        if (Array.isArray(productsRes.body)) {
            testProduct = productsRes.body[0];
        } else if (productsRes.body.data && Array.isArray(productsRes.body.data)) {
            testProduct = productsRes.body.data[0];
        }

        if (!testProduct) {
            console.error('No products found to test with. (Response:', productsRes.body, ')');
            process.exit(1);
        }

        const initialStock = testProduct.currentStock || 0;
        console.log(`Target Product: ${testProduct.name} (Stock: ${initialStock})`);

        // 2. Get a Member and Field Visitor for the transaction
        console.log('Fetching Users...');
        const userRes = await makeRequest('/users', 'GET');

        let membersList = [];
        let fvList = [];

        if (userRes.body.data) {
            membersList = userRes.body.data.members || [];
            fvList = userRes.body.data.fieldVisitors || [];
        }

        const fv = fvList[0];
        const member = membersList[0];

        if (!fv || !member) {
            console.error('Need at least one FV and Member. Found Members:', membersList.length, 'FVs:', fvList.length);
            process.exit(1);
        }

        // 3. Test SELL (Member Sells 1 to Company -> Stock +1)
        console.log('\n[TEST 1] Member SELLS 1 Item (Expect Stock +1)');
        const sellRes = await makeRequest('/transactions', 'POST', {
            transactionType: 'sell',
            memberId: member.id, // API returns 'id' usually
            fieldVisitorId: fv.userId,
            productId: testProduct.productId,
            quantity: 1,
            unitType: testProduct.unit,
            unitPrice: 100
        });

        if (sellRes.status === 201) {
            // Check new stock
            const pRes = await makeRequest('/products', 'GET');
            const updatedP = pRes.body.find(p => p.productId === testProduct.productId);
            console.log(`SELL Result: Stock is now ${updatedP.currentStock}. (Change: ${updatedP.currentStock - initialStock})`);
            if (updatedP.currentStock === initialStock + 1) {
                console.log('✅ PASS: Stock increased by 1.');
            } else {
                console.error('❌ FAIL: Stock mismatch.');
            }
        } else {
            console.error('SELL Transaction Failed:', sellRes.body);
        }

        // 4. Test BUY (Member Buys 1 from Company -> Stock -1)
        console.log('\n[TEST 2] Member BUYS 1 Item (Expect Stock -1)');
        // Refresh stock key
        const pResBeforeBuy = await makeRequest('/products', 'GET');
        const stockBeforeBuy = pResBeforeBuy.body.find(p => p.productId === testProduct.productId).currentStock;

        if (stockBeforeBuy < 1) {
            console.log('Skipping Buy Test - Insufficient Stock.');
        } else {
            const buyRes = await makeRequest('/transactions', 'POST', {
                transactionType: 'buy',
                memberId: member.id,
                fieldVisitorId: fv.userId,
                productId: testProduct.productId,
                quantity: 1,
                unitType: testProduct.unit,
                unitPrice: 100
            });

            if (buyRes.status === 201) {
                const pResAfter = await makeRequest('/products', 'GET');
                const pAfter = pResAfter.body.find(p => p.productId === testProduct.productId);
                console.log(`BUY Result: Stock is now ${pAfter.currentStock}. (Change: ${pAfter.currentStock - stockBeforeBuy})`);
                if (pAfter.currentStock === stockBeforeBuy - 1) {
                    console.log('✅ PASS: Stock decreased by 1.');
                } else {
                    console.error('❌ FAIL: Stock mismatch.');
                }
            } else {
                console.error('BUY Transaction Failed:', buyRes.body);
            }
        }

    } catch (e) {
        console.error('Test Error:', e);
    }
};

runTest();
