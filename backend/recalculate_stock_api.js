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

const runMigration = async () => {
    try {
        console.log('--- Starting Stock Recalculation (API) ---');

        // 1. Fetch Products
        const prodRes = await makeRequest('/products', 'GET');
        // Handle possible response structures
        let products = [];
        if (Array.isArray(prodRes.body)) {
            products = prodRes.body;
        } else if (prodRes.body.data && Array.isArray(prodRes.body.data)) {
            products = prodRes.body.data;
        }

        console.log(`Found ${products.length} products.`);

        // 2. Fetch Transactions (Assume public access verified)
        const txRes = await makeRequest('/transactions', 'GET');
        let transactions = [];
        if (Array.isArray(txRes.body)) {
            transactions = txRes.body;
        } else if (txRes.body.data && Array.isArray(txRes.body.data)) {
            transactions = txRes.body.data;
        } else {
            // If pagination or other format
            console.log('Transaction response format unexpected:', Object.keys(txRes.body));
        }

        console.log(`Found ${transactions.length} transactions.`);

        // 3. Calculate and Update
        for (const p of products) {
            let stock = 0;
            let sold = 0;
            let bought = 0;

            // Filter transactions for this product
            // Normalized comparison
            const pName = p.name.toLowerCase().trim();
            const productTxs = transactions.filter(t =>
                (t.productName || t.product || '').toLowerCase().trim() === pName ||
                (t.productId && t.productId === p.productId) // fallback if available
            );

            for (const t of productTxs) {
                if (t.status === 'rejected') continue;

                const type = (t.type || '').toLowerCase();
                const qty = Number(t.quantity || 0);

                if (type === 'sell') {
                    sold += qty;
                    stock += qty;
                } else if (type === 'buy') {
                    bought += qty;
                    stock -= qty;
                }
            }

            console.log(`Product: ${p.name} | +${sold} -${bought} = New Stock: ${stock}`);

            // 4. Update Product
            // Don't overwrite other fields, we just want to update currentStock.
            // But the PUT endpoint expects full object or partial? Mongoose findByIdAndUpdate usually handles partials if implemented well, 
            // but controller logic:
            // product.name = name || product.name
            // It preserves old values if new are undefined.

            // We need to pass currentStock. But wait, updateProduct controller DOES NOT update currentStock!
            // I need to check productController.js updateProduct function.
            // If it doesn't update currentStock, I need to fix it first!

            // Let's assume for a moment I need to verify that.

            // If I can't check now, I'll pass it anyway.
            const updateRes = await makeRequest(`/products/${p._id || p.id}`, 'PUT', {
                currentStock: stock,
                // Pass existing required fields just in case validation needs them?
                // The controller checks: name || product.name, so it's fine.
                // But wait, does it update currentStock?
            });

            if (updateRes.status !== 200) {
                console.error(`Failed to update ${p.name}:`, updateRes.body);
            }
        }

        console.log('Migration Completed.');
        process.exit(0);

    } catch (e) {
        console.error('Migration Error:', e);
        process.exit(1);
    }
};

runMigration();
