const express = require('express');
const router = express.Router();
const {
    importITSector,
    setCommonPassword,
    getUnchangedPasswords
} = require('../controllers/itSectorController');
const { protect } = require('../middleware/authMiddleware');

router.post('/import', protect, importITSector);
router.post('/set-common-password', protect, setCommonPassword);
router.get('/unchanged-passwords', protect, getUnchangedPasswords);

module.exports = router;
