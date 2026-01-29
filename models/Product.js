const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    // We can use default Mongo _id, but frontend expects string id. 
    // We'll let Mongo generate _id and map it in frontend or just use it.
    // For consistency with existing frontend logic which generates ID, we can keep 'id' field or map _id.
    // Let's rely on Mongoose _id but map it to 'id' in the JSON response.

    name: { type: String, required: true },
    description: { type: String, default: '' },
    defaultPrice: { type: Number, required: true }, // Selling price
    buyingPrice: { type: Number, required: true }, // Buying cost
    unit: { type: String, default: 'Kg' },
    productId: { type: String }, // Optional custom ID
    images: [{ type: String }], // Array of image paths/URLs
    soldPerMonth: { type: Number, default: 0 },
    boughtPerMonth: { type: Number, default: 0 },
    totalSoldValue: { type: Number, default: 0 },
    totalBoughtValue: { type: Number, default: 0 },
    currentStock: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

// Virtual for 'id' to hide _id
ProductSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

ProductSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) { delete ret._id }
});

module.exports = mongoose.model('Product', ProductSchema);
