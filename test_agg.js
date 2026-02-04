const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

const Product = require('./models/Product');

async function testAggregation() {
    let output = '';
    const log = (msg) => {
        console.log(msg);
        output += msg + '\n';
    };

    try {
        await mongoose.connect(process.env.MONGO_URI);

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        log('Running Aggregation...');
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
                    },
                    currentStock: {
                        $subtract: [
                            {
                                $reduce: {
                                    input: {
                                        $filter: {
                                            input: '$transactions',
                                            as: 'tx',
                                            cond: { $eq: ['$$tx.type', 'buy'] }
                                        }
                                    },
                                    initialValue: 0,
                                    in: { $add: ['$$value', '$$this.quantity'] }
                                }
                            },
                            {
                                $reduce: {
                                    input: {
                                        $filter: {
                                            input: '$transactions',
                                            as: 'tx',
                                            cond: { $eq: ['$$tx.type', 'sell'] }
                                        }
                                    },
                                    initialValue: 0,
                                    in: { $add: ['$$value', '$$this.quantity'] }
                                }
                            }
                        ]
                    }
                }
            },
            {
                $project: {
                    name: 1,
                    currentStock: 1,
                    totalSoldValue: 1,
                    totalBoughtValue: 1,
                    transactionsCount: { $size: '$transactions' }
                }
            }
        ]);

        log('Results:');
        products.forEach(p => {
            log(`- ${p.name}: Stock ${p.currentStock}, Sold Val ${p.totalSoldValue}, Bought Val ${p.totalBoughtValue}, Txs ${p.transactionsCount}`);
        });

        fs.writeFileSync('agg_output.txt', output, 'utf8');
        mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        log('ERROR: ' + err.message);
        process.exit(1);
    }
}

testAggregation();
