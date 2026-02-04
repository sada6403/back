const Transaction = require('../models/Transaction');
const Member = require('../models/Member');
const Product = require('../models/Product');
const BranchManager = require('../models/BranchManager');
const mongoose = require('mongoose');

// @desc Get Visual Analytics Data (Branch Transactions, Product Analysis, Member Distribution)
// @route GET /api/reports/visual-analytics
const getVisualAnalytics = async (req, res) => {
    try {
        // 1. Branch-wise Transaction Totals
        const branchTransactions = await Transaction.aggregate([
            {
                $group: {
                    _id: '$branchId',
                    totalAmount: { $sum: '$totalAmount' },
                    transactionCount: { $sum: 1 }
                }
            },
            { $sort: { totalAmount: -1 } }
        ]);

        // 2. Product-wise Buy/Sell Analysis
        const productAnalysis = await Transaction.aggregate([
            {
                $group: {
                    _id: { productName: '$productName', type: '$type' },
                    totalAmount: { $sum: '$totalAmount' },
                    totalQuantity: { $sum: '$quantity' }
                }
            }
        ]);

        // 3. Branch-wise Member Distribution
        const memberDistribution = await Member.aggregate([
            {
                $group: {
                    _id: '$branchId',
                    memberCount: { $sum: 1 }
                }
            },
            { $sort: { memberCount: -1 } }
        ]);

        // --- Fetch Branch Names ---
        const transactionBranchIds = branchTransactions.map(t => t._id).filter(id => id);
        const memberBranchIds = memberDistribution.map(m => m._id).filter(id => id);
        const allBranchIds = [...new Set([...transactionBranchIds, ...memberBranchIds])];

        const branchManagers = await BranchManager.find({ branchId: { $in: allBranchIds } }).select('branchId branchName');
        const branchNameMap = {};
        branchManagers.forEach(bm => {
            if (bm.branchId) branchNameMap[bm.branchId] = bm.branchName;
        });

        // --- Format Data ---

        const branchTransactionMap = {};
        branchTransactions.forEach(item => {
            const branchId = item._id;
            const branchName = branchNameMap[branchId] || branchId || 'Unknown Branch';
            branchTransactionMap[branchName] = {
                totalAmount: item.totalAmount,
                count: item.transactionCount
            };
        });

        const productMap = {};
        productAnalysis.forEach(item => {
            const productName = item._id.productName || 'Unknown Product';
            const type = item._id.type;

            if (!productMap[productName]) {
                productMap[productName] = { buy: 0, sell: 0, buyQty: 0, sellQty: 0 };
            }

            if (type === 'buy') {
                productMap[productName].buy = item.totalAmount;
                productMap[productName].buyQty = item.totalQuantity;
            } else if (type === 'sell') {
                productMap[productName].sell = item.totalAmount;
                productMap[productName].sellQty = item.totalQuantity;
            }
        });

        const memberDistributionMap = {};
        memberDistribution.forEach(item => {
            const branchId = item._id;
            const branchName = branchNameMap[branchId] || branchId || 'Unknown Branch';
            memberDistributionMap[branchName] = item.memberCount;
        });

        res.json({
            success: true,
            data: {
                branchTransactions: branchTransactionMap,
                productAnalysis: productMap,
                memberDistribution: memberDistributionMap
            }
        });
    } catch (error) {
        console.error('[getVisualAnalytics] Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get visual analytics',
            error: error.message
        });
    }
};

module.exports = {
    getVisualAnalytics
};
