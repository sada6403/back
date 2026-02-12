const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Member = require('../models/Member');
const FieldVisitor = require('../models/FieldVisitor');
const BranchManager = require('../models/BranchManager');
const Notification = require('../models/Notification');
const Product = require('../models/Product');
const { generateBillPDF } = require('../utils/pdfGenerator');

// Generate Bill Number
const generateBillNumber = async (type) => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD

    // Find count of transactions today to sequentialize
    // Note: In high currency, use atomic counter. Here using simple count for demo.
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const count = await Transaction.countDocuments({
        date: { $gte: startOfDay, $lte: endOfDay }
    });

    const sequence = (count + 1).toString().padStart(5, '0');
    return `NF-${type[0]}-${dateStr}-${sequence}`; // NF-B-20231212-00001
};

// @desc    Create new transaction
// @route   POST /api/transactions
// @access  Private
const createTransaction = async (req, res) => {
    try {
        const {
            transactionType, // BUY or SELL
            memberId,
            fieldVisitorId,
            productId,
            quantity,
            unitType,
            unitPrice,
            status // Optional status override
        } = req.body;

        const branchId = req.user?.branchId || 'default-branch';
        const normalizedType = (transactionType || '').toString().toLowerCase();
        if (!['buy', 'sell'].includes(normalizedType)) {
            return res.status(400).json({ success: false, message: 'transactionType must be BUY or SELL' });
        }

        const member = await Member.findById(memberId);
        if (!member) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }
        if (member.branchId !== branchId) {
            return res.status(403).json({ success: false, message: 'Member not in your branch' });
        }

        const fv = (mongoose.Types.ObjectId.isValid(fieldVisitorId))
            ? await FieldVisitor.findById(fieldVisitorId)
            : await FieldVisitor.findOne({ userId: fieldVisitorId });

        if (!fv) {
            console.error('[createTransaction] Field visitor not found:', fieldVisitorId);
            return res.status(404).json({ success: false, message: 'Field visitor not found' });
        }
        if (fv.branchId !== branchId) {
            console.error('[createTransaction] FV branch mismatch. Req branch:', branchId, 'FV branch:', fv.branchId);
            return res.status(403).json({ success: false, message: 'Field visitor not in your branch' });
        }

        const product = await Product.findOne({ productId });
        const productName = product ? product.name : 'Unknown Product';

        const totalAmount = Number(quantity) * Number(unitPrice);
        if (isNaN(totalAmount)) {
            return res.status(400).json({ success: false, message: 'Invalid quantity or unit price' });
        }

        const billNumber = await generateBillNumber(normalizedType.toUpperCase());

        const transaction = new Transaction({
            billNumber,
            type: normalizedType,
            memberId: member._id,
            fieldVisitorId: fv._id,
            productName,
            quantity: Number(quantity),
            unitType,
            unitPrice: Number(unitPrice),
            totalAmount,
            branchId,
            memberCode: member.memberId, // Save the visible Member Code
            date: new Date(), // Explicitly set date to ensure it exists for PDF
            status: status || 'approved' // Default to approved if not provided
        });

        // Generate PDF
        let pdfUrl = '';
        try {
            pdfUrl = await generateBillPDF(transaction, member, fv);
            transaction.pdfUrl = pdfUrl;
        } catch (pdfErr) {
            console.error('[createTransaction] PDF Generation Error:', pdfErr.message);
            // We can continue or fail. Let's fail for now as the app expects a bill.
            throw new Error(`PDF Generation failed: ${pdfErr.message}`);
        }

        // STOCK MANAGEMENT LOGIC
        if (product) {
            if (normalizedType === 'sell') {
                // Field Visitor Selling (Company -> Member) -> Stock Decreases
                if (product.currentStock < Number(quantity)) {
                    return res.status(400).json({ success: false, message: `Insufficient stock! Available: ${product.currentStock} ${product.unit}` });
                }
                product.currentStock -= Number(quantity);
            } else if (normalizedType === 'buy') {
                // Field Visitor Buying (Member -> Company) -> Stock Increases
                product.currentStock += Number(quantity);
            }
            await product.save();
        } else {
            console.warn(`[createTransaction] Product not found for ID: ${productId}. Stock not updated.`);
        }

        const saved = await transaction.save();

        const populated = await Transaction.findById(saved._id)
            .populate('memberId', 'name mobile branchId')
            .populate('fieldVisitorId', 'name userId branchId managerId')
            .lean();

        // Notify field visitor + branch manager
        try {
            const manager = fv.managerId ? await BranchManager.findById(fv.managerId).lean() : null;
            const title = `${normalizedType === 'sell' ? '📤 Sale' : '🛒 Purchase'} - ${productName}`;
            const body = `Transaction of Rs. ${totalAmount} on ${new Date().toLocaleDateString()} for ${member.name}`;

            const notifications = [
                {
                    title,
                    body,
                    date: new Date(),
                    isRead: false,
                    attachment: pdfUrl,
                    transactionId: saved._id,
                    fieldVisitorId: fv._id,
                    memberId: member._id,
                    branchId,
                    userId: fv._id,
                    userRole: 'field_visitor'
                }
            ];

            if (manager) {
                notifications.push({
                    title,
                    body,
                    date: new Date(),
                    isRead: false,
                    attachment: pdfUrl,
                    transactionId: saved._id,
                    managerId: manager._id,
                    memberId: member._id,
                    branchId,
                    userId: manager._id,
                    userRole: 'branch_manager'
                });
            }

            await Notification.insertMany(notifications);
        } catch (notifyErr) {
            console.error('[createTransaction] Notification Error:', notifyErr.message);
            // Don't fail the whole transaction if notification fails
        }

        res.status(201).json({
            success: true,
            data: populated
        });
    } catch (error) {
        console.error('[createTransaction] Major Error:', error);
        console.error('[createTransaction] Stack:', error.stack);
        console.error('[createTransaction] Body:', req.body);
        console.error('[createTransaction] User:', req.user);
        res.status(500).json({ success: false, message: error.message || 'Failed to create transaction' });
    }
};

// @desc    Get transactions
// @route   GET /api/transactions
// @access  Private
const getTransactions = async (req, res) => {
    try {
        const { memberId, type, fieldVisitorId, startDate, endDate, billNumber, branchId: queryBranchId } = req.query;
        // If logged in, use user's branch. If not (Management IT), use query param or show all/default.
        const userBranchId = req.user?.branchId;
        const userRole = req.user?.role;

        const query = {};

        // IT Sector and Admin can see all branches. Others are restricted to their own.
        const isIT = ['it_sector', 'admin', 'it'].includes(userRole);

        let effectiveBranchId = queryBranchId;
        if (effectiveBranchId && effectiveBranchId !== 'All') {
            const bRec = await BranchManager.findOne({
                $or: [{ branchId: effectiveBranchId }, { branchName: effectiveBranchId }]
            }).select('branchId').lean();
            if (bRec) {
                effectiveBranchId = bRec.branchId;
            }
        }

        if (!isIT) {
            // Restriction for normal users
            if (userBranchId) {
                query.branchId = userBranchId;
            } else if (effectiveBranchId) {
                query.branchId = effectiveBranchId;
            }
        } else if (effectiveBranchId) {
            // IT can optionally filter by branch
            query.branchId = effectiveBranchId;
        }

        if (memberId) query.memberId = memberId;
        if (fieldVisitorId) query.fieldVisitorId = fieldVisitorId;
        if (type) query.type = type.toString().toLowerCase();

        const searchBill = billNumber || req.query.billNumber;
        if (searchBill) {
            const bn = searchBill.trim();
            // Use exact match if it looks like a full bill number (NF-X-YYYYMMDD-NNNNN)
            // NF-B-20260211-00008 is 19 chars. Let's check >= 13 to be safe.
            if (bn.startsWith('NF-') && bn.length >= 13) {
                query.billNumber = bn;
            } else {
                query.billNumber = { $regex: bn, $options: 'i' };
            }
        }

        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const transactions = await Transaction.find(query)
            .sort({ date: -1 })
            .populate('memberId', 'name memberId contact branchId')
            .populate('fieldVisitorId', 'fullName userId branchId');

        res.json({ success: true, count: transactions.length, data: transactions });
    } catch (error) {
        console.error('[getTransactions] Error:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch transactions', error: error.message });
    }
};

// @desc    Download bill and create notification
// @route   GET /api/transactions/:id/download-bill
// @access  Private
const downloadBill = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?._id;
        const userRole = req.user?.role;

        // Find transaction with populated data (Include address/phone/area for PDF)
        const transaction = await Transaction.findById(id)
            .populate('memberId', 'name mobile memberCode address')
            .populate('fieldVisitorId', 'name userId fullName phone area')
            .lean();

        if (!transaction) {
            return res.status(404).json({ success: false, message: 'Transaction not found' });
        }

        // Check if user has access to this transaction
        const branchId = req.user?.branchId || 'default-branch';
        if (transaction.branchId !== branchId) {
            return res.status(403).json({ success: false, message: 'Access denied to this transaction' });
        }

        // REGENERATE PDF: Ensure file exists and uses latest design
        try {
            await generateBillPDF(transaction, transaction.memberId || {}, transaction.fieldVisitorId || {});
        } catch (e) {
            console.error('PDF Regeneration failed:', e.message);
        }

        // Create notification for bill download
        const memberName = transaction.memberId?.name || 'Unknown';
        const fvName = transaction.fieldVisitorId?.name || transaction.fieldVisitorId?.fullName || 'Field Visitor';
        const transactionType = transaction.type === 'buy' ? '🛒 Purchase' : '📤 Sale';

        const notificationTitle = `📄 Bill Downloaded - ${transactionType}`;
        const notificationBody = `Bill #${transaction.billNumber} for ${memberName} (Rs. ${transaction.totalAmount}) was downloaded by ${req.user.name || 'user'}`;

        // Create notification for field visitor (if not the downloader)
        if (transaction.fieldVisitorId && transaction.fieldVisitorId._id.toString() !== userId.toString()) {
            await Notification.create({
                title: notificationTitle,
                body: notificationBody,
                date: new Date(),
                isRead: false,
                attachment: transaction.pdfUrl,
                transactionId: transaction._id,
                fieldVisitorId: transaction.fieldVisitorId._id,
                memberId: transaction.memberId?._id,
                branchId: transaction.branchId,
                userId: transaction.fieldVisitorId._id,
                userRole: 'field_visitor'
            });
        }

        // Create notification for branch manager
        const fv = await FieldVisitor.findById(transaction.fieldVisitorId);
        if (fv && fv.managerId) {
            const manager = await BranchManager.findById(fv.managerId);
            if (manager) {
                await Notification.create({
                    title: notificationTitle,
                    body: notificationBody,
                    date: new Date(),
                    isRead: false,
                    attachment: transaction.pdfUrl,
                    transactionId: transaction._id,
                    managerId: manager._id,
                    memberId: transaction.memberId?._id,
                    branchId: transaction.branchId,
                    userId: manager._id,
                    userRole: 'branch_manager'
                });
            }
        }

        // Log the download action
        console.log(`[downloadBill] Bill ${transaction.billNumber} downloaded by ${req.user.name} (${userRole})`);

        // Return transaction with PDF URL
        res.json({
            success: true,
            message: 'Bill accessed successfully. Notification sent.',
            data: {
                billNumber: transaction.billNumber,
                pdfUrl: transaction.pdfUrl,
                transaction
            }
        });
    } catch (error) {
        console.error('[downloadBill] Error:', error.message);
        res.status(500).json({ success: false, message: 'Failed to download bill', error: error.message });
    }
};

// @desc    Update transaction status (Manager/Admin)
// @route   PATCH /api/transactions/:id
// @access  Private
const updateTransactionStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, approvedBy, note } = req.body;

        const transaction = await Transaction.findById(id);
        if (!transaction) {
            return res.status(404).json({ success: false, message: 'Transaction not found' });
        }

        transaction.status = status;
        if (approvedBy) transaction.approvedBy = approvedBy;
        transaction.approvedAt = new Date();
        if (note !== undefined) transaction.note = note;

        const updated = await transaction.save();

        res.json({
            success: true,
            message: `Transaction ${status} successfully`,
            data: updated
        });
    } catch (error) {
        console.error('[updateTransactionStatus] Error:', error.message);
        res.status(500).json({ success: false, message: 'Failed to update transaction status', error: error.message });
    }
};

// @desc    Update transaction details
// @route   PUT /api/transactions/:id
// @access  Private (Manager only)
const updateTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const { productName, quantity, unitPrice, totalAmount, type, status, note } = req.body;

        const transaction = await Transaction.findById(id);
        if (!transaction) {
            return res.status(404).json({ success: false, message: 'Transaction not found' });
        }

        // Update fields
        if (productName) transaction.productName = productName;
        if (quantity) transaction.quantity = Number(quantity);
        if (unitPrice) transaction.unitPrice = Number(unitPrice);
        if (type) transaction.type = type.toLowerCase();
        if (status) transaction.status = status;
        if (note !== undefined) transaction.note = note;

        // Recalculate total if needed
        if (quantity || unitPrice) {
            transaction.totalAmount = transaction.quantity * transaction.unitPrice;
        } else if (totalAmount) {
            transaction.totalAmount = Number(totalAmount);
        }

        const updated = await transaction.save();

        res.json({
            success: true,
            message: 'Transaction updated successfully',
            data: updated
        });
    } catch (error) {
        console.error('[updateTransaction] Error:', error.message);
        res.status(500).json({ success: false, message: 'Failed to update transaction', error: error.message });
    }
};

// @desc    Delete transaction
// @route   DELETE /api/transactions/:id
// @access  Private (Manager only)
const deleteTransaction = async (req, res) => {
    try {
        const { id } = req.params;

        const transaction = await Transaction.findById(id);
        if (!transaction) {
            return res.status(404).json({ success: false, message: 'Transaction not found' });
        }

        await Transaction.findByIdAndDelete(id);

        res.json({
            success: true,
            message: 'Transaction deleted successfully'
        });
    } catch (error) {
        console.error('[deleteTransaction] Error:', error.message);
        res.status(500).json({ success: false, message: 'Failed to delete transaction', error: error.message });
    }
};

const queryEcho = (req, res) => {
    res.json({
        query: req.query,
        user: req.user ? { id: req.user._id, role: req.user.role, branchId: req.user.branchId } : null,
        url: req.originalUrl
    });
};

module.exports = {
    createTransaction,
    getTransactions,
    downloadBill,
    updateTransactionStatus,
    updateTransaction,
    deleteTransaction,
    queryEcho
};
