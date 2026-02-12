const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// Custom ID generation not strictly needed if we leverage Mongo _id, 
// but frontend might expect string IDs. Mongoose handles this.

const Transaction = require('../models/Transaction'); // Import Transaction model

// GET all products with dynamic stock calculation
router.get('/', async (req, res) => {
    try {
        // Fetch products and transactions
        const products = await Product.find().sort({ createdAt: -1 }).lean();
        const transactions = await Transaction.find().lean();

        // Calculate stock for each product
        const calculatedProducts = products.map(product => {
            // Normalize product name for matching
            const pName = product.name.trim().toLowerCase();

            const productTxns = transactions.filter(t =>
                t.productName.trim().toLowerCase() === pName &&
                (t.status || 'approved').toLowerCase() === 'approved' // Fallback to approved if missing, strict check otherwise
            );

            const totalBought = productTxns
                .filter(t => t.type.toLowerCase() === 'buy')
                .reduce((sum, t) => sum + (t.quantity || 0), 0);

            const totalSold = productTxns
                .filter(t => t.type.toLowerCase() === 'sell')
                .reduce((sum, t) => sum + (t.quantity || 0), 0);

            const totalBoughtValue = productTxns
                .filter(t => t.type.toLowerCase() === 'buy')
                .reduce((sum, t) => sum + (t.totalAmount || 0), 0);

            const totalSoldValue = productTxns
                .filter(t => t.type.toLowerCase() === 'sell')
                .reduce((sum, t) => sum + (t.totalAmount || 0), 0);

            return {
                ...product,
                currentStock: totalBought - totalSold,
                boughtPerMonth: totalBought,
                soldPerMonth: totalSold,
                totalBoughtValue,
                totalSoldValue
            };
        });

        res.json(calculatedProducts);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST create product
router.post('/', async (req, res) => {
    const { name, description, price, cost, images, soldPerMonth, boughtPerMonth, currentStock } = req.body;

    // Validations could go here

    const product = new Product({
        name,
        description,
        price,
        cost,
        images,
        soldPerMonth,
        boughtPerMonth,
        currentStock
    });

    try {
        const newProduct = await product.save();
        res.status(201).json(newProduct);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PUT update product
router.put('/:id', async (req, res) => {
    try {
        // req.body might contain 'id', exclude it from update or Mongoose ignores it usually
        const updatedProduct = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedProduct);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE product
router.delete('/:id', async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: 'Product deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
