const express = require('express');
const router = express.Router();
const { getProducts, createProduct, updateProduct, deleteProduct } = require('../controllers/productController');

const upload = require('../middleware/uploadMiddleware');

// Wrapper to debug upload errors
const uploadWrapper = (req, res, next) => {
    console.log('--- Upload Middleware Started ---');
    upload.array('images', 5)(req, res, (err) => {
        if (err) {
            console.error('--- Upload Middleware Error ---', err);
            return res.status(400).json({ message: 'File upload error', error: err.message });
        }
        console.log('--- Upload Middleware Success ---');
        next();
    });
};

router.route('/')
    .get(getProducts)
    .post(uploadWrapper, createProduct);

router.route('/:id')
    .put(uploadWrapper, updateProduct)
    .patch(uploadWrapper, updateProduct) // Added PATCH support
    .delete(deleteProduct);

module.exports = router;
