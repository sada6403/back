const express = require('express');
const router = express.Router();
const UserSession = require('../models/UserSession');
const ActivityLog = require('../models/ActivityLog');

// START SESSION (Login)
router.post('/session/start', async (req, res) => {
    try {
        const { userId, username, role, ipAddress, deviceInfo } = req.body;
        const session = new UserSession({
            userId,
            username,
            role,
            loginTime: new Date(),
            ipAddress,
            deviceInfo
        });
        await session.save();
        res.json({ success: true, sessionId: session._id });
    } catch (e) {
        console.error('Session Start Error:', e);
        res.status(500).json({ success: false, message: e.message });
    }
});

// END SESSION (Logout)
router.post('/session/end', async (req, res) => {
    try {
        const { sessionId } = req.body;
        if (!sessionId) return res.status(400).json({ success: false, message: 'Session ID required' });

        const session = await UserSession.findById(sessionId);
        if (session) {
            session.logoutTime = new Date();
            // Calculate duration in minutes
            const durationMs = session.logoutTime - session.loginTime;
            session.durationMinutes = Math.floor(durationMs / 60000);
            await session.save();
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, message: 'Session not found' });
        }
    } catch (e) {
        console.error('Session End Error:', e);
        res.status(500).json({ success: false, message: e.message });
    }
});

// LOG ACTIVITY
router.post('/activity', async (req, res) => {
    try {
        const { userId, username, role, action, details, target } = req.body;
        const log = new ActivityLog({
            userId,
            username,
            role,
            action,
            details,
            target,
            timestamp: new Date()
        });
        await log.save();
        res.json({ success: true });
    } catch (e) {
        console.error('Activity Log Error:', e);
        res.status(500).json({ success: false, message: e.message });
    }
});

// GET DASHBOARD ANALYSIS (Sessions & Activities)
// Optionally filter by role, e.g., ?role=IT Sector
router.get('/data', async (req, res) => {
    try {
        const roleFilter = req.query.role;
        const query = roleFilter ? { role: roleFilter } : {};

        // Fetch Sessions (sort by loginTime desc)
        const sessions = await UserSession.find(query).sort({ loginTime: -1 }).limit(100);

        // Fetch Activities
        const activities = await ActivityLog.find(query).sort({ timestamp: -1 }).limit(100);

        res.json({
            success: true,
            sessions,
            activities
        });
    } catch (e) {
        console.error('Analysis Data Error:', e);
        res.status(500).json({ success: false, message: e.message });
    }
});

module.exports = router;
