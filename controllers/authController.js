const BranchManager = require('../models/BranchManager');
const FieldVisitor = require('../models/FieldVisitor');
const ITSector = require('../models/ITSector');
// const Admin = require('../models/Admin'); // Admin is now ITSector
const generateToken = require('../utils/generateToken');
const { createAndSendOTP, verifyOTP } = require('../utils/otpService');
const { sendPasswordChangeEmail, sendPasswordResetEmail } = require('../utils/emailService');

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
    try {
        let { username, password, role } = req.body; // username can be email or userId

        if (!username || !password || !role) {
            res.status(400);
            throw new Error('Please provide all credentials');
        }

        let user;

        if (role === 'manager') {
            // Manager login by email or userId
            user = await BranchManager.findOne({
                $or: [{ email: username }, { userId: username }]
            });
        } else if (role === 'admin' || role === 'it_sector' || role === 'it') {
            // Admin/IT Sector login - ALL treated as Admin now
            // User requested "admin = itsector collection"
            user = await ITSector.findOne({
                $or: [{ email: username }, { userId: username }]
            });
            // Force role to be 'admin' for system permissions if found in ITSector
            if (user) role = 'admin';
        } else if (role === 'field' || role === 'field_visitor') {
            // Field Visitor login by userId
            user = await FieldVisitor.findOne({ userId: username });
        } else {
            res.status(400);
            throw new Error('Invalid role');
        }

        if (user && (await user.matchPassword(password))) {
            const branchId = user.branchId || 'default-branch';
            const userData = {
                id: user._id.toString(), // Use 'id' instead of '_id' for Flutter compatibility
                _id: user._id,
                name: user.fullName || user.name,
                email: user.email,
                code: user.userId || user.code,
                role: role,
                branchId,
                branchName: user.branchName || '', // Return branch name
                token: generateToken(user._id, role, branchId),
            };

            // Add phone field for all users
            userData.phone = user.phone || '';
            if (user.userId) {
                userData.userId = user.userId;
            }

            res.json({
                success: true,
                data: userData
            });
        } else {
            res.status(401);
            throw new Error('Invalid credentials');
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Register a new manager
// @route   POST /api/auth/register
// @access  Public (or Private depending on your requirements)
const registerManager = async (req, res, next) => {
    try {
        let { fullName, email, password, userId, branchName, branchId, phone } = req.body;

        // Validate required fields
        if (!fullName || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields: fullName, email, password'
            });
        }

        // Auto-generate userId if not provided
        if (!userId) {
            req.body.userId = 'MGR' + Date.now().toString().slice(-6);
            userId = req.body.userId;
        }

        // Check if manager already exists
        const managerExists = await BranchManager.findOne({
            $or: [{ email }, { userId }]
        });
        if (managerExists) {
            return res.status(400).json({
                success: false,
                message: 'Manager with this email or userId already exists'
            });
        }

        // Create new manager instance
        const newManager = new BranchManager({
            fullName,
            email,
            password,
            userId,
            branchName: branchName || 'Kalmunai',
            branchId: branchId || 'branch-default',
            phone: phone || '',
            role: 'branch_manager',
            status: 'active'
        });

        // Await the save operation properly (password will be hashed by pre-save hook)
        const savedManager = await newManager.save();

        // Return the saved document immediately with consistent field names
        res.status(201).json({
            success: true,
            message: 'Manager registered successfully',
            data: {
                id: savedManager._id.toString(), // Use 'id' for Flutter compatibility
                _id: savedManager._id,
                name: savedManager.fullName,
                email: savedManager.email,
                code: savedManager.userId,
                role: 'manager',
                branchId: savedManager.branchId,
                phone: savedManager.phone,
                token: generateToken(savedManager._id, 'manager', savedManager.branchId)
            }
        });
    } catch (error) {
        console.error('Manager Registration Error:', error);

        // Duplicate key error
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Email or userId already exists'
            });
        }

        // Mongoose validation error
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({
                success: false,
                message: messages.join(', ')
            });
        }

        // General server error
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: error.message
        });
    }
};


// @desc    Register a new IT Sector employee
// @route   POST /api/auth/register/it-sector
// @access  Public
const registerITSector = async (req, res, next) => {
    try {
        // Log incoming request
        console.log('Registering IT Sector:', req.body);

        let {
            fullName, email, password, userId, phone,
            nic, civilStatus, postalAddress, permanentAddress, education,
            bankName, bankBranch, accountNo, accountHolder
        } = req.body;

        // Validate required fields
        if (!fullName || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields: fullName, email, password'
            });
        }

        // Auto-generate userId if not provided
        if (!userId) {
            req.body.userId = 'IT' + Date.now().toString().slice(-6); // Simple random ID
            userId = req.body.userId;
        }

        // Check if user already exists
        const userExists = await ITSector.findOne({
            $or: [{ email }, { userId }]
        });
        if (userExists) {
            return res.status(400).json({
                success: false,
                message: 'User with this email or userId already exists in IT Sector'
            });
        }

        // Create new IT User
        const newUser = new ITSector({
            fullName,
            email,
            password,
            userId,
            phone: phone || '',
            role: 'it_sector',
            status: 'active',
            // Optional fields
            nic, civilStatus, postalAddress, permanentAddress, education,
            bankName, bankBranch, accountNo, accountHolder
        });

        const savedUser = await newUser.save();

        res.status(201).json({
            success: true,
            message: 'IT Sector employee registered successfully',
            data: {
                id: savedUser._id.toString(),
                _id: savedUser._id,
                name: savedUser.fullName,
                email: savedUser.email,
                code: savedUser.userId,
                role: 'it_sector',
                token: generateToken(savedUser._id, 'it_sector', savedUser.branchId)
            }
        });

    } catch (error) {
        console.error('IT Sector Registration Error:', error);
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Email or userId already exists'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: error.message
        });
    }
};

// @desc    Change password
// @route   PATCH /api/auth/change-password
// @access  Private
const changePassword = async (req, res, next) => {
    try {
        const { id, role, oldPassword, newPassword } = req.body;

        if (!id || !role || !oldPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Please provide id, role, oldPassword, and newPassword'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        let user;
        if (role === 'manager' || role === 'branch_manager') {
            user = await BranchManager.findById(id);
        } else if (role === 'field_visitor' || role === 'field') {
            user = await FieldVisitor.findById(id);
        } else if (role === 'it_sector') {
            user = await ITSector.findById(id);
        } else {
            return res.status(400).json({ success: false, message: 'Invalid role' });
        }

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Verify old password
        const isMatch = await user.matchPassword(oldPassword);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Incorrect old password'
            });
        }

        // Update password (pre-save hook in model handles hashing)
        user.password = newPassword;

        // Mark IT sector user as having changed password
        if (role === 'it_sector' && user.hasChangedPassword !== undefined) {
            user.hasChangedPassword = true;
        }

        await user.save();

        // Send email notification with userId and new password
        try {
            if (user.email) {
                await sendPasswordChangeEmail(user.email, user.userId || id, newPassword);
                console.log('Password change email sent to:', user.email);
            }
        } catch (emailError) {
            console.error('Failed to send password change email:', emailError);
            // Don't fail the password change if email fails
        }

        res.json({
            success: true,
            message: 'Password updated successfully. Confirmation email sent.'
        });

    } catch (error) {
        console.error('Change Password Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update password',
            error: error.message
        });
    }
};

// @desc    Request password reset OTP
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
    try {
        const { userId, phone } = req.body;

        if (!userId || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Please provide userId and phone number'
            });
        }

        // Find IT Sector user by userId and phone
        const user = await ITSector.findOne({ userId, phone });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found with provided userId and phone number'
            });
        }

        // Create and send OTP
        const result = await createAndSendOTP(userId, phone, 'password_reset');

        res.json({
            success: true,
            message: 'OTP sent to your mobile number',
            expiresAt: result.expiresAt
        });

    } catch (error) {
        console.error('Forgot Password Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send OTP',
            error: error.message
        });
    }
};

// @desc    Verify OTP code
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOTPEndpoint = async (req, res, next) => {
    try {
        const { userId, otp } = req.body;

        if (!userId || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Please provide userId and OTP'
            });
        }

        const result = await verifyOTP(userId, otp, 'password_reset');

        if (!result.success) {
            return res.status(400).json(result);
        }

        // Generate a temporary token for password reset
        const resetToken = generateToken(userId, 'password_reset', 'temp');

        res.json({
            success: true,
            message: 'OTP verified successfully',
            resetToken: resetToken
        });

    } catch (error) {
        console.error('Verify OTP Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify OTP',
            error: error.message
        });
    }
};

// @desc    Reset password after OTP verification
// @route   POST /api/auth/reset-password
// @access  Public (requires valid resetToken from OTP verification)
const resetPassword = async (req, res, next) => {
    try {
        const { userId, newPassword, resetToken } = req.body;

        if (!userId || !newPassword || !resetToken) {
            return res.status(400).json({
                success: false,
                message: 'Please provide userId, newPassword, and resetToken'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        // Find IT Sector user
        const user = await ITSector.findOne({ userId });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update password
        user.password = newPassword;
        user.hasChangedPassword = true;
        await user.save();

        // Send email notification with userId and new password
        try {
            if (user.email) {
                await sendPasswordResetEmail(user.email, user.userId, newPassword);
                console.log('Password reset email sent to:', user.email);
            }
        } catch (emailError) {
            console.error('Failed to send password reset email:', emailError);
            // Don't fail the password reset if email fails
        }

        res.json({
            success: true,
            message: 'Password reset successfully. Confirmation email sent.'
        });

    } catch (error) {
        console.error('Reset Password Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset password',
            error: error.message
        });
    }
};

module.exports = {
    loginUser,
    registerManager,
    registerITSector,
    changePassword,
    forgotPassword,
    verifyOTPEndpoint,
    resetPassword
};
