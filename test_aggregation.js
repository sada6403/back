const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

const testAgg = async () => {
    const uri = 'mongodb+srv://cst23071_db_user:vgquPlo0tLETMjvK@cluster0.s8fljgu.mongodb.net/nf-farming?retryWrites=true&w=majority';
    console.log('Connecting to Remote DB...');
    await mongoose.connect(uri);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    console.log('Running Aggregation...');
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
                }
            }
        },
        {
            $project: {
                name: 1,
                totalSoldValue: 1,
                totalBoughtValue: 1,
                currentStock: 1
            }
        }
    ]);

    const fs = require('fs');
    fs.writeFileSync('agg_output_clean.json', JSON.stringify(products, null, 2));
    console.log('Written to agg_output_clean.json');
    process.exit(0);
};

testAgg();
