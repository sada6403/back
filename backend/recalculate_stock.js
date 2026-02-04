const mongoose = require('mongoose');
const Product = require('./models/Product');
const Transaction = require('./models/Transaction');

// DB URI (Hardcoded for this script)
const MONGO_URI = 'mongodb+srv://dineshkumar32266:20021025@fms.v06d9.mongodb.net/nf-farming?retryWrites=true&w=majority&appName=FMS';

const recalculateStock = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB...');

        const products = await Product.find({});
        console.log(`Found ${products.length} products. Recalculating stock...`);

        for (const p of products) {
            const txs = await Transaction.find({ productName: p.name });

            let stock = 0;
            let soldCount = 0;
            let boughtCount = 0;

            for (const t of txs) {
                // Check status - only count approved transactions?
                if (t.status === 'rejected') continue;

                // Transaction model has quantity.
                const type = (t.type || '').toLowerCase().trim();
                const qty = Number(t.quantity);

                if (type === 'sell') {
                    // Member Sell -> Stock +
                    soldCount += qty;
                    stock += qty;
                } else if (type === 'buy') {
                    // Member Buy -> Stock -
                    boughtCount += qty;
                    stock -= qty;
                }
            }

            p.currentStock = stock;
            await p.save();
            console.log(`Updated ${p.name}: +${soldCount} -${boughtCount} = Stock: ${stock} ${p.unit}`);
        }

        console.log('Stock Recalculation Complete.');
        process.exit(0);

    } catch (e) {
        console.error('Migration Error:', e);
        process.exit(1);
    }
};

recalculateStock();
