const CompanyTransfer = require('../models/CompanyTransfer');
const BranchManager = require('../models/BranchManager');
const FieldVisitor = require('../models/FieldVisitor');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = 'public/uploads/company-transfers';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'transfer-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 5 } // 5MB
});

exports.upload = upload;

// ─── Submit Company Transfer ───────────────────────────────────
// POST /api/company-transfers/submit
exports.submitTransfer = async (req, res) => {
    try {
        const { amount, depositorName } = req.body;
        const userId = req.user.id;
        const submitterRole = req.user.role; // e.g., 'manager', 'field_visitor'

        // Map to Model names
        let userModel = '';
        if (submitterRole === 'manager') userModel = 'BranchManager';
        else if (submitterRole === 'field_visitor') userModel = 'FieldVisitor';
        else return res.status(403).json({ message: 'Unauthorized role' });

        const UserModel = mongoose.model(userModel);
        const submitter = await UserModel.findById(userId);
        if (!submitter) return res.status(404).json({ message: 'Submitter not found' });

        const receiptUrl = req.file
            ? `/uploads/company-transfers/${req.file.filename}`
            : null;

        const transfer = await CompanyTransfer.create({
            userId,
            userModel,
            userRole: submitterRole,
            amount: Number(amount),
            depositorName: depositorName || submitter.fullName,
            depositorNic: submitter.nic || '',
            receiptUrl,
            status: 'pending'
        });

        res.status(201).json({
            message: 'Transfer submitted successfully',
            transfer
        });
    } catch (err) {
        console.error('submitTransfer error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── Get Pending Transfers ─────────────────────────────────────
// GET /api/company-transfers/pending
exports.getPendingTransfers = async (req, res) => {
    try {
        const transfers = await CompanyTransfer.find({ status: 'pending' })
            .sort({ createdAt: -1 });
        res.json(transfers);
    } catch (err) {
        console.error('getPendingTransfers error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── Get All Transfers ─────────────────────────────────────────
// GET /api/company-transfers
exports.getAllTransfers = async (req, res) => {
    try {
        const userRole = req.user.role;
        const userId = req.user.id;

        // IT Sector and Admin can see all
        const isIT = ['it_sector', 'admin', 'it', 'analyzer'].includes(userRole);

        let query = {};
        if (!isIT) {
            query.userId = userId;
        }

        const transfers = await CompanyTransfer.find(query).sort({ updatedAt: -1 });
        res.json(transfers);
    } catch (err) {
        console.error('getAllTransfers error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ─── Approve Transfer ──────────────────────────────────────────
// PATCH /api/company-transfers/:id/approve
exports.approveTransfer = async (req, res) => {
    try {
        console.log('--- Approval Process Started ---');
        const { id } = req.params;
        const { approvedAmount } = req.body;
        console.log('Transfer ID:', id);
        console.log('Approved Amount:', approvedAmount);

        const approverName = (req.user && (req.user.fullName || req.user.name)) || 'Admin';
        console.log('Approver Name:', approverName);

        const transfer = await CompanyTransfer.findById(id);
        if (!transfer) {
            console.log('Error: Transfer not found');
            return res.status(404).json({ message: 'Transfer not found' });
        }
        console.log('Found Transfer:', transfer.depositorName, 'from', transfer.userModel);

        if (transfer.status !== 'pending') {
            console.log('Error: Transfer already processed');
            return res.status(400).json({ message: 'Transfer already processed' });
        }

        // 1. Find the Submitter by their Model
        console.log('Searching for submitter in model:', transfer.userModel, 'with ID:', transfer.userId);
        const UserModel = mongoose.model(transfer.userModel);
        const submitter = await UserModel.findById(transfer.userId);

        if (!submitter) {
            console.log('Error: Submitter user not found in', transfer.userModel);
            return res.status(404).json({ message: 'Submitter user not found' });
        }
        console.log('Found Submitter:', submitter.fullName || submitter.name, 'Current Wallet:', submitter.walletBalance);

        // 2. Wallet Balance Check & Deduction Logic
        const finalApprovedAmount = Number(approvedAmount) || transfer.amount;
        console.log('Final Approved Amount:', finalApprovedAmount);

        // Explicit balance check requested by user
        if ((submitter.walletBalance || 0) < finalApprovedAmount) {
            console.log('Error: Invalid wallet balance for submitter:', submitter.fullName);
            return res.status(400).json({ message: 'Invalid wallet balance' });
        }

        const updatedUser = await UserModel.findByIdAndUpdate(
            transfer.userId,
            { $inc: { walletBalance: -finalApprovedAmount } },
            { new: true, validateBeforeSave: false }
        );

        if (!updatedUser) {
            console.log('Error: Failed to update submitter wallet');
            return res.status(500).json({ message: 'Failed to update submitter wallet' });
        }
        console.log('Submitter wallet updated. New balance:', updatedUser.walletBalance);

        // 3. Update Transfer Record
        transfer.status = 'accepted';
        transfer.approvedAmount = finalApprovedAmount;
        transfer.approvedBy = approverName;
        transfer.approvedAt = new Date();
        await transfer.save({ validateBeforeSave: false });
        console.log('Transfer record updated successfully');

        res.json({
            message: 'Transfer accepted and wallet updated',
            transfer,
            newWalletBalance: updatedUser.walletBalance
        });
    } catch (err) {
        console.error('approveTransfer error CRITICAL:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// ─── Decline Transfer ──────────────────────────────────────────
// PATCH /api/company-transfers/:id/decline
exports.declineTransfer = async (req, res) => {
    try {
        const { id } = req.params;
        const { note } = req.body;

        const transfer = await CompanyTransfer.findById(id);
        if (!transfer) return res.status(404).json({ message: 'Transfer not found' });

        transfer.status = 'declined';
        transfer.note = note || '';
        transfer.approvedAt = new Date();
        transfer.approvedBy = req.user.name || 'Admin';
        await transfer.save();

        res.json({ message: 'Transfer declined', transfer });
    } catch (err) {
        console.error('declineTransfer error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};
