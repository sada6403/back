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

    const product = await Product.create({
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
    });
    res.status(201).json(product);
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Manager
const updateProduct = async (req, res) => {
    const {
        name,
        defaultPrice,
        unit,
        productId,
        currentStock,
        description,
        buyingPrice,
        images,
        soldPerMonth,
        boughtPerMonth
    } = req.body;

    const product = await Product.findById(req.params.id);

    if (product) {
        product.name = name || product.name;
        product.defaultPrice = defaultPrice !== undefined ? defaultPrice : product.defaultPrice;
        product.unit = unit || product.unit;
        product.productId = productId || product.productId;
        product.description = description !== undefined ? description : product.description;
        product.buyingPrice = buyingPrice !== undefined ? buyingPrice : product.buyingPrice;
        if (currentStock !== undefined) product.currentStock = currentStock;
        if (images !== undefined) product.images = images;
        if (soldPerMonth !== undefined) product.soldPerMonth = soldPerMonth;
        if (boughtPerMonth !== undefined) product.boughtPerMonth = boughtPerMonth;

        const updatedProduct = await product.save();
        res.json(updatedProduct);
    } else {
        res.status(404);
        throw new Error('Product not found');
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
