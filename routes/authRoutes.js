const express = require('express');
const router = express.Router();
const {
    loginUser,
    registerManager,
    registerITSector,
    changePassword,
    forgotPassword,
    verifyOTPEndpoint,
    resetPassword,
    registerAnalyzer
} = require('../controllers/authController');

router.post('/login', loginUser);
router.post('/register', registerManager);
router.post('/register/it-sector', registerITSector);
router.post('/register/analyzer', registerAnalyzer);
router.patch('/change-password', changePassword);

// Password reset routes
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTPEndpoint);
router.post('/reset-password', resetPassword);

module.exports = router;
