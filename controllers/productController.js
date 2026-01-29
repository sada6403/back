const Product = require('../models/Product');

// @desc    Get all products
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        const products = await Product.aggregate([
            {
                $lookup: {
                    from: 'transactions',
                    localField: 'name',
                    foreignField: 'productName',
                    as: 'transactions'
                }
            },
            {
                $addFields: {
                    currentMonthTransactions: {
                        $filter: {
                            input: '$transactions',
                            as: 'tx',
                            cond: {
                                $and: [
                                    { $gte: ['$$tx.date', startOfMonth] },
                                    { $lte: ['$$tx.date', endOfMonth] }
                                ]
                            }
                        }
                    }
                }
            },
            {
                $addFields: {
                    soldPerMonth: {
                        $reduce: {
                            input: {
                                $filter: {
                                    input: '$currentMonthTransactions',
                                    as: 'tx',
                                    cond: { $eq: ['$$tx.type', 'sell'] }
                                }
                            },
                            initialValue: 0,
                            in: { $add: ['$$value', '$$this.quantity'] }
                        }
                    },
                    boughtPerMonth: {
                        $reduce: {
                            input: {
                                $filter: {
                                    input: '$currentMonthTransactions',
                                    as: 'tx',
                                    cond: { $eq: ['$$tx.type', 'buy'] }
                                }
                            },
                            initialValue: 0,
                            in: { $add: ['$$value', '$$this.quantity'] }
                        }
                    },
                    totalSoldValue: {
                        $reduce: {
                            input: {
                                $filter: {
                                    input: '$transactions',
                                    as: 'tx',
                                    cond: { $eq: ['$$tx.type', 'sell'] }
                                }
                            },
                            initialValue: 0,
                            in: { $add: ['$$value', '$$this.totalAmount'] }
                        }
                    },
                    totalBoughtValue: {
                        $reduce: {
                            input: {
                                $filter: {
                                    input: '$transactions',
                                    as: 'tx',
                                    cond: { $eq: ['$$tx.type', 'buy'] }
                                }
                            },
                            initialValue: 0,
                            in: { $add: ['$$value', '$$this.totalAmount'] }
                        }
                    }
                }
            },
            {
                $addFields: {
                    history: {
                        $filter: {
                            input: '$transactions',
                            as: 'tx',
                            cond: {
                                $gte: ['$$tx.date', new Date(new Date().setFullYear(new Date().getFullYear() - 1))]
                            }
                        }
                    }
                }
            },
            {
                $addFields: {
                    history: {
                        $map: {
                            input: {
                                $filter: {
                                    input: '$transactions',
                                    as: 'tx',
                                    cond: {
                                        $gte: ['$$tx.date', new Date(new Date().setFullYear(new Date().getFullYear() - 1))]
                                    }
                                }
                            },
                            as: 'tx',
                            in: {
                                date: '$$tx.date',
                                type: '$$tx.type',
                                quantity: '$$tx.quantity',
                                totalAmount: '$$tx.totalAmount'
                            }
                        }
                    }
                }
            },
            {
                $project: {
                    transactions: 0,
                    currentMonthTransactions: 0
                }
            }
        ]);




        res.json(products);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create product (Seed helper)
// @route   POST /api/products
// @desc    Create product (Seed helper)
// @route   POST /api/products
const createProduct = async (req, res) => {
    try {
        const {
            name,
            defaultPrice,
            unit,
            productId,
            description,
            buyingPrice,
            currentStock,
            images,
            soldPerMonth,
            boughtPerMonth,
            totalSoldValue,
            totalBoughtValue
        } = req.body;

        console.log('--- Create Product Request ---');
        console.log('Body:', req.body);
        console.log('Files:', req.files);

        let imagePaths = [];
        if (req.files && req.files.length > 0) {
            imagePaths = req.files.map(file => `uploads/products/${file.filename}`);
        } else if (images) {
            // Handle if images are passed as array of strings (though multer usually handles files)
            // But if we want to support existing logic or JSON body for some reason
            imagePaths = Array.isArray(images) ? images : [images];
        }

        const product = await Product.create({
            name,
            defaultPrice,
            unit,
            productId,
            description,
            buyingPrice,
            currentStock,
            images: imagePaths,
            soldPerMonth,
            boughtPerMonth,
            totalSoldValue,
            totalBoughtValue
        });
        res.status(201).json(product);
    } catch (error) {
        console.error('Create Product Error:', error);
        res.status(400).json({ message: error.message || 'Failed to create product' });
    }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Manager
const updateProduct = async (req, res) => {
    console.log('!!! ENTERING updateProduct (Robust) !!!');
    // Log raw inputs for debugging
    console.log('Body Keys:', Object.keys(req.body));
    console.log('Files:', req.files ? req.files.length : 'None');

    try {
        const {
            name,
            defaultPrice,
            unit,
            productId,
            currentStock,
            description,
            buyingPrice,
            // Images might come as JSON string or array depending on request type
            existingImages: existingImagesRaw,
            soldPerMonth,
            boughtPerMonth
        } = req.body;

        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // --- 1. Text Field Updates (Handle 0 and empty strings correctly) ---
        // We check !== undefined so we don't overwrite if field is missing (PATCH behavior),
        // but we DO overwrite if it's sent as empty string or 0.
        if (name !== undefined) product.name = name;
        if (description !== undefined) product.description = description;
        if (unit !== undefined) product.unit = unit;
        if (productId !== undefined) product.productId = productId;

        // Parse numbers safely
        if (defaultPrice !== undefined) product.defaultPrice = Number(defaultPrice);
        if (buyingPrice !== undefined) product.buyingPrice = Number(buyingPrice);
        if (currentStock !== undefined) product.currentStock = Number(currentStock);
        if (soldPerMonth !== undefined) product.soldPerMonth = Number(soldPerMonth);
        if (boughtPerMonth !== undefined) product.boughtPerMonth = Number(boughtPerMonth);

        // --- 2. Image Logic ---
        let finalImages = [];

        // A. Parse Existing Images
        // If existingImagesRaw is sent, we respect it (even if empty). 
        // If it is entirely MISSING (undefined), we keep existing product.images (PATCH behavior).
        if (existingImagesRaw !== undefined) {
            try {
                // If it's a string (from Multipart or JSON stringified), parse it
                if (typeof existingImagesRaw === 'string') {
                    finalImages = JSON.parse(existingImagesRaw);
                } else if (Array.isArray(existingImagesRaw)) {
                    finalImages = existingImagesRaw;
                } else {
                    // Fallback for single value or weird format
                    finalImages = [existingImagesRaw];
                }
            } catch (e) {
                console.error('Error parsing existingImages:', e);
                finalImages = []; // Safety fallback
            }
        } else {
            // NOT sent -> Keep old images
            finalImages = product.images || [];
        }

        // B. Add New Files (Uploads)
        if (req.files && req.files.length > 0) {
            const newPaths = req.files.map(file => `uploads/products/${file.filename}`);
            finalImages = [...finalImages, ...newPaths];
        }

        // Assign to product
        product.images = finalImages;

        console.log('--- Saving Product ---');
        console.log('Final Images:', product.images);
        console.log('Final Price:', product.defaultPrice);

        const updatedProduct = await product.save();
        res.json(updatedProduct);

    } catch (error) {
        console.error('Update Product Error:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Manager
const deleteProduct = async (req, res) => {
    const product = await Product.findById(req.params.id);

    if (product) {
        await product.deleteOne();
        res.json({ message: 'Product removed' });
    } else {
        res.status(404);
        throw new Error('Product not found');
    }
};

module.exports = { getProducts, createProduct, updateProduct, deleteProduct };
