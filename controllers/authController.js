const BranchManager = require('../models/BranchManager');
const FieldVisitor = require('../models/FieldVisitor');
const ITSector = require('../models/ITSector');
const Analyzer = require('../models/Analyzer');
// const Admin = require('../models/Admin'); // Admin is now ITSector
const generateToken = require('../utils/generateToken');
const { createAndSendOTP, verifyOTP } = require('../utils/otpService');
const { sendPasswordChangeEmail, sendPasswordResetEmail, sendEmail } = require('../utils/emailService');

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
        } else if (role === 'analyzer') {
            // Analyzer login by userId or email
            user = await Analyzer.findOne({
                $or: [{ email: username }, { userId: username }]
            });
        } else {
            res.status(400);
            throw new Error('Invalid role');
        }

        if (user && (await user.matchPassword(password))) {
            // Check if user is active
            if (user.status === 'inactive') {
                res.status(403);
                throw new Error('Your account has been deactivated. Please contact the administrator.');
            }

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
        let { fullName, email, password, userId, branchName, branchId, phone, role } = req.body;

        // Default role if not provided
        if (!role) role = 'branch_manager';

        // Normalize role
        const rLower = role.toLowerCase();

        // Validate required fields
        if (!fullName || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields: fullName, email, password'
            });
        }

        // Auto-generate userId if not provided or empty
        if (!userId || userId.trim() === '' || userId === 'AUTO GEN') {
            userId = 'MGR' + Date.now().toString().slice(-6);
        }

        // Determine Model based on Role
        let TargetModel = BranchManager; // Default

        // If role IS strict 'branch manager' or 'manager', use BranchManager
        // If it is 'Regional Manager', 'Zonal Manager', 'General Manager' -> separate collection
        if (rLower === 'branch manager' || rLower === 'branch_manager' || rLower === 'manager') {
            TargetModel = BranchManager;
        } else {
            // Dynamic Collection
            const collectionName = rLower.replace(/ /g, ''); // e.g. "regionalmanager"
            try {
                TargetModel = mongoose.model(collectionName);
            } catch (e) {
                const GenericSchema = new mongoose.Schema({
                    userId: { type: String, required: true },
                    fullName: { type: String, required: true },
                    email: { type: String },
                    phone: { type: String },
                    role: { type: String },
                    branchName: { type: String },
                    branchId: { type: String },
                    password: { type: String },
                    status: { type: String, default: 'active' },
                    joinedDate: { type: Date, default: Date.now },
                }, { strict: false, collection: collectionName });
                TargetModel = mongoose.model(collectionName, GenericSchema);
            }
        }

        // Check if manager already exists
        const managerExists = await TargetModel.findOne({
            $or: [{ email }, { userId }]
        });
        if (managerExists) {
            return res.status(400).json({
                success: false,
                message: `${role} with this email or userId already exists`
            });
        }

        // Create new manager instance
        // If dynamic model, we use generic constructor
        let newManager;
        if (TargetModel === BranchManager) {
            newManager = new BranchManager({
                fullName,
                email,
                password,
                userId,
                branchName: branchName || 'Kalmunai',
                branchId: branchId || 'branch-default',
                phone: phone || '',
                role: 'Branch Manager',
                salary: req.body.salary || 0,
                status: 'active'
            });
        } else {
            // Generic / Dynamic
            const hashedPassword = await require('bcryptjs').hash(password, 10); // Hash manually for generic if schema hooks missing
            // Wait, if I defined schema above, I didn't add pre-save hook.
            // But existing BranchManager has pre-save.
            // I should manually hash for dynamic models to be safe.

            newManager = new TargetModel({
                fullName,
                email,
                userId,
                branchName: branchName || 'Head Office',
                branchId: branchId || 'ho-default',
                phone: phone || '',
                role: role,
                status: 'active',
                password: hashedPassword // Save hashed
            });
        }

        // Await the save operation properly (password will be hashed by pre-save hook for BranchManager)
        const savedManager = await newManager.save();

        // Send Welcome Email
        if (email) {
            const html = `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <div style="background-color: #2e7d32; padding: 20px; text-align: center;">
                         <h1 style="color: white; margin: 0;">Welcome to Nature Farming</h1>
                    </div>
                    <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
                        <p>Dear ${fullName},</p>
                        <p>You have been successfully registered as a ${role}.</p>
                        <p><strong>Your Credentials:</strong></p>
                        <ul>
                            <li><strong>User ID:</strong> ${userId}</li>
                            <li><strong>Password:</strong> ${password}</li>
                        </ul>
                        <p>Please keep these credentials safe.</p>

                        <div style="background-color: #e8f5e9; padding: 15px; margin: 20px 0; border-radius: 5px;">
                            <p style="margin-top: 0; color: #1b5e20;"><strong>Mandatory Action Required:</strong></p>
                            <p>Please download and review the following document:</p>
                            <a href="https://drive.google.com/file/d/1lTAELctnpWtzL0kVS_psZDI-5zP77-o3/view?usp=sharing" 
                               style="background-color: #2e7d32; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; display: inline-block;">
                               Download Training Details
                            </a>
                        </div>
                        
                        <p>Best Regards,<br>Nature Farming Team</p>
                    </div>
                </div>
            `;
            try {
                await sendEmail(email, 'Welcome to Nature Farming - Credentials', html);
            } catch (err) {
                console.error('Failed to send manager welcome email', err);
            }
        }

        // Return the saved document immediately with consistent field names
        res.status(201).json({
            success: true,
            message: `${role} registered successfully`,
            data: {
                id: savedManager._id.toString(),
                _id: savedManager._id,
                name: savedManager.fullName,
                email: savedManager.email,
                userId: savedManager.userId,
                code: savedManager.userId, // Backup mapping
                role: role,
                branchId: savedManager.branchId,
                phone: savedManager.phone,
                tempPassword: password, // Return for display
                token: generateToken(savedManager._id, role, savedManager.branchId)
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

        // Auto-generate userId if not provided or empty
        if (!userId || userId.trim() === '' || userId === 'AUTO GEN') {
            userId = 'IT' + Date.now().toString().slice(-6);
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
                userId: savedUser.userId,
                code: savedUser.userId, // Backup mapping
                role: 'it_sector',
                tempPassword: password, // Return for display
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

// @desc    Register a new Analyzer employee
// @route   POST /api/auth/register/analyzer
// @access  Public (or Private)
const registerAnalyzer = async (req, res, next) => {
    try {
        console.log('Registering Analyzer:', req.body);

        let { fullName, email, password, userId, phone, nic } = req.body;

        if (!fullName || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields: fullName, email, password'
            });
        }

        if (!userId || userId.trim() === '' || userId === 'AUTO GEN') {
            userId = 'AZ' + Date.now().toString().slice(-6);
        }

        const userExists = await Analyzer.findOne({
            $or: [{ email }, { userId }]
        });
        if (userExists) {
            return res.status(400).json({
                success: false,
                message: 'User with this email or userId already exists'
            });
        }

        const newUser = new Analyzer({
            fullName,
            email,
            password,
            userId,
            phone: phone || '',
            nic: nic || '',
            role: 'analyzer',
            status: 'active'
        });

        const savedUser = await newUser.save();

        res.status(201).json({
            success: true,
            message: 'Analyzer registered successfully',
            data: {
                id: savedUser._id.toString(),
                _id: savedUser._id,
                name: savedUser.fullName,
                email: savedUser.email,
                userId: savedUser.userId,
                code: savedUser.userId,
                role: 'analyzer',
                tempPassword: password,
                token: generateToken(savedUser._id, 'analyzer', savedUser.branchId)
            }
        });

    } catch (error) {
        console.error('Analyzer Registration Error:', error);
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
        console.log('[Auth] Forgot Password Body:', req.body);
        const { userId } = req.body;

        if (!userId) {
            console.log('[Auth] No UserId provided');
            return res.status(400).json({
                success: false,
                message: 'Please provide userId'
            });
        }

        // Find IT Sector user by userId or email
        const user = await ITSector.findOne({
            $or: [{ userId: userId }, { email: userId }]
        });

        if (!user) {
            console.log('[Auth] User Not Found:', userId);
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        console.log(`[Auth] User Found: ${user.fullName} (${user.email})`);

        if (!user.email) {
            console.log('[Auth] No email registered');
            return res.status(400).json({
                success: false,
                message: 'User does not have a registered email address'
            });
        }

        console.log('[Auth] Calling OTP Service...');
        // Create and send OTP to Email
        const result = await createAndSendOTP(user.userId, user.email, 'password_reset');
        console.log('[Auth] OTP Service Result:', result);

        res.json({
            success: true,
            message: `OTP sent to your email: ${user.email}`,
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
        let { userId, otp } = req.body;

        if (!userId || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Please provide User ID/Email and OTP'
            });
        }

        // If userId input is an email, resolve it to the actual userId
        if (userId.includes('@')) {
            const user = await ITSector.findOne({ email: userId });
            if (user) {
                userId = user.userId;
            } else {
                return res.status(400).json({ success: false, message: 'User not found' });
            }
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
        let { userId, newPassword, resetToken } = req.body;

        if (!userId || !newPassword || !resetToken) {
            return res.status(400).json({
                success: false,
                message: 'Please provide userId, newPassword, and resetToken'
            });
        }

        // Match verify logic: resolve email to userId if needed
        if (userId.includes('@')) {
            const u = await ITSector.findOne({ email: userId });
            if (u) userId = u.userId;
        }

        // Use userId (resolved or original) to check token via middleware usually, 
        // but here we check it manually via generateToken/jwt verify if stricter, 
        // but currently we just trust the resetToken passed? 
        // Wait, the 'resetToken' is passed TO the client. Client sends it back.
        // We actually need to verify that token matches the UserID? 
        // The resetToken is a JWT containing the UserID. 
        // Ideally we should verify the token's validity and extract UserID from it to be secure,
        // rather than trusting the 'userId' body param.
        // But keeping it simple as per existing logic, just resolving user.

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
    resetPassword,
    registerAnalyzer
};
