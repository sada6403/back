const BranchManager = require('../models/BranchManager');
const ITSector = require('../models/ITSector');

// @desc    Get all managers
// @route   GET /api/managers
// @access  Private
const getManagers = async (req, res) => {
    try {
        const managers = await BranchManager.find({}).select('-password');
        res.json({ success: true, count: managers.length, managers });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch managers', error: error.message });
    }
};

// @desc    Update manager
// @route   PUT /api/managers/:id
// @access  Private/Manager (Super Admin ideally, but Manager for now)
const updateManager = async (req, res) => {
    try {
        const { fullName, email, userId, branchName, branchId, phone, status } = req.body;
        const manager = await BranchManager.findById(req.params.id);

        if (manager) {
            manager.fullName = fullName || manager.fullName;
            manager.email = email || manager.email;
            manager.userId = userId || manager.userId;
            manager.branchName = branchName || manager.branchName;
            manager.branchId = branchId || manager.branchId;
            manager.phone = phone || manager.phone;
            manager.status = status || manager.status;

            const updatedManager = await manager.save();
            res.json({
                success: true,
                data: {
                    id: updatedManager._id,
                    name: updatedManager.fullName,
                    email: updatedManager.email,
                    code: updatedManager.userId,
                    role: 'manager',
                    branchId: updatedManager.branchId,
                    phone: updatedManager.phone,
                    status: updatedManager.status
                }
            });
        } else {
            res.status(404);
            throw new Error('Manager not found');
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Update failed', error: error.message });
    }
};

// @desc    Delete manager
// @route   DELETE /api/managers/:id
// @access  Private/Manager
const deleteManager = async (req, res) => {
    try {
        console.log('=== DELETE REQUEST RECEIVED ===');
        console.log('ID:', req.params.id);
        console.log('User role:', req.user?.role);

        let manager = await BranchManager.findById(req.params.id);
        console.log('BranchManager found:', !!manager);

        if (manager) {
            console.log('Deleting BranchManager:', manager.fullName);
            await manager.deleteOne();
            console.log('BranchManager deleted successfully');
            return res.json({ success: true, message: 'Manager removed' });
        }

        // If not found in BranchManager, check ITSector
        const itEmployee = await ITSector.findById(req.params.id);
        console.log('ITSector found:', !!itEmployee);

        if (itEmployee) {
            console.log('Deleting ITSector employee:', itEmployee.fullName);
            await itEmployee.deleteOne();
            console.log('ITSector employee deleted successfully');
            return res.json({ success: true, message: 'IT Sector employee removed' });
        }

        console.log('Employee not found in either collection');
        res.status(404);
        throw new Error('Manager or IT Employee not found');
    } catch (error) {
        console.error('Delete error:', error.message);
        res.status(500).json({ success: false, message: 'Delete failed', error: error.message });
    }
};

module.exports = { getManagers, updateManager, deleteManager };
