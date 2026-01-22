const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    defaultPrice: { type: Number, required: true },
    buyingPrice: { type: Number, default: 0 }, // Cost
    unit: { type: String, enum: ['Kg', 'g', 'number', 'packets'], required: true },
    productId: { type: String, unique: true }, // e.g. prod-001
    description: { type: String },
    currentStock: { type: Number, default: 0 },
    soldPerMonth: { type: Number, default: 0 },
    boughtPerMonth: { type: Number, default: 0 },
    images: [{ type: String }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Product', ProductSchema);
