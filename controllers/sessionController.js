const UserSession = require('../models/UserSession');
const ActivityLog = require('../models/ActivityLog');
const { calculateDurationMinutes, getCurrentSriLankaTime } = require('../utils/timezone');

/**
 * Start or resume a user session
 * POST /api/session/start
 */
const startSession = async (req, res) => {
    console.log('[SessionController] startSession called');
    console.log('[SessionController] UserSession schema paths:', Object.keys(UserSession.schema.paths));
    try {
        const { deviceId, platform, appVersion, deviceInfo, currentScreen } = req.body;
        const userId = req.user._id || req.user.userId;
        const username = req.user.fullName || req.user.name || req.user.username;
        const role = req.user.role;
        const branchId = req.user.branchId || '';
        const branchName = req.user.branchName || '';
        const ipAddress = req.ip || req.connection.remoteAddress;
        const sessionToken = req.headers.authorization?.replace('Bearer ', '');

        // Check for existing active session with same userId and deviceId
        const existingSession = await UserSession.findOne({
            userId,
            deviceId,
            isOnline: true
        });

        if (existingSession) {
            // Resume existing session
            existingSession.lastPing = new Date();
            existingSession.sessionToken = sessionToken;
            existingSession.appVersion = appVersion || existingSession.appVersion;
            existingSession.currentScreen = currentScreen || existingSession.currentScreen;
            await existingSession.save();

            // Log app_open event
            await ActivityLog.create({
                userId,
                username,
                role,
                branchName,
                eventType: 'app_open',
                action: 'APP_OPEN',
                details: 'Resumed existing session',
                deviceId,
                deviceInfo,
                platform,
                ipAddress
            });

            return res.json({
                success: true,
                message: 'Session resumed',
                session: existingSession
            });
        }

        // Mark any other active sessions for this user as offline (different device login)
        await UserSession.updateMany(
            { userId, isOnline: true },
            [
                {
                    $set: {
                        isOnline: false,
                        logoutTime: new Date(),
                        durationMinutes: {
                            $floor: {
                                $divide: [
                                    { $subtract: [new Date(), "$loginTime"] },
                                    60000
                                ]
                            }
                        }
                    }
                }
            ]
        );

        // Create new session
        const newSession = await UserSession.create({
            userId,
            username,
            role,
            branchName,
            branchId,
            isOnline: true,
            sessionToken,
            loginTime: new Date(),
            lastPing: new Date(),
            deviceId,
            platform: platform || 'unknown',
            appVersion,
            deviceInfo,
            ipAddress,
            currentScreen
        });

        console.log('[SessionController] New session created:', JSON.stringify(newSession, null, 2));

        // Log login event
        await ActivityLog.create({
            userId,
            username,
            role,
            branchName,
            branchId,
            eventType: 'login', // Use lowercase as per schema enum preference
            action: 'LOGIN',
            details: `Logged in from ${platform || 'unknown'} device`,
            deviceId,
            deviceInfo,
            platform,
            ipAddress
        });

        res.json({
            success: true,
            message: 'Session started',
            session: newSession
        });
    } catch (error) {
        console.error('[startSession] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start session',
            error: error.message
        });
    }
};

/**
 * Ping to keep session alive (heartbeat)
 * POST /api/session/ping
 */
const pingSession = async (req, res) => {
    try {
        const { deviceId, currentScreen } = req.body;
        const userId = req.user._id || req.user.userId;

        const session = await UserSession.findOne({
            userId,
            deviceId,
            isOnline: true
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'No active session found'
            });
        }

        session.lastPing = new Date();
        if (currentScreen) {
            session.currentScreen = currentScreen;
        }
        await session.save();

        res.json({
            success: true,
            message: 'Ping received',
            lastPing: session.lastPingSL
        });
    } catch (error) {
        console.error('[pingSession] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to ping session',
            error: error.message
        });
    }
};

/**
 * End user session
 * POST /api/session/end
 */
const endSession = async (req, res) => {
    try {
        const { deviceId, reason } = req.body;
        const userId = req.user._id || req.user.userId;
        const username = req.user.fullName || req.user.name || req.user.username;
        const role = req.user.role;
        const branchName = req.user.branchName || req.user.branchId || '';

        const session = await UserSession.findOne({
            userId,
            deviceId,
            isOnline: true
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'No active session found'
            });
        }

        // Mark session as offline
        session.isOnline = false;
        session.logoutTime = new Date();
        session.durationMinutes = calculateDurationMinutes(session.loginTime, session.logoutTime);
        await session.save();

        // Determine event type based on reason
        const eventType = reason === 'app_close' ? 'app_close' : 'logout';

        // Log logout/app_close event
        await ActivityLog.create({
            userId,
            username,
            role,
            branchName,
            eventType: eventType === 'logout' ? 'logout' : eventType,
            action: eventType.toUpperCase(),
            details: reason || 'User logged out',
            deviceId: session.deviceId,
            deviceInfo: session.deviceInfo,
            platform: session.platform,
            ipAddress: session.ipAddress
        });

        res.json({
            success: true,
            message: 'Session ended',
            duration: session.durationMinutes
        });
    } catch (error) {
        console.error('[endSession] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to end session',
            error: error.message
        });
    }
};

/**
 * Log generic user activity
 * POST /api/session/log
 */
const logActivity = async (req, res) => {
    try {
        const { eventType, details, metadata, deviceId } = req.body;
        const userId = req.user._id || req.user.userId;
        const username = req.user.fullName || req.user.name || req.user.username;
        const role = req.user.role;
        const branchId = req.user.branchId || '';
        const branchName = req.user.branchName || '';

        await ActivityLog.create({
            userId,
            username,
            role,
            branchId,
            branchName,
            eventType,
            action: eventType,
            details,
            metadata,
            deviceId,
            platform: req.body.platform,
            ipAddress: req.ip
        });

        res.json({ success: true });
    } catch (error) {
        console.error('[logActivity] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to log activity',
            error: error.message
        });
    }
};

module.exports = {
    startSession,
    pingSession,
    endSession,
    logActivity,
    fixSessionData
};

/**
 * Fix corrupted session data (missing isOnline field)
 * POST /api/session/fix-data
 */
const fixSessionData = async (req, res) => {
    try {
        console.log('[FixSessionData] Starting repair...');

        // 1. Log total sessions
        const totalSessions = await UserSession.countDocuments({});
        console.log(`[FixSessionData] Total sessions: ${totalSessions}`);

        // 2. Find sessions where isOnline is undefined/null
        // Note: In mongoose, non-existent fields might not be queryable easily if schema defaults mask them,
        // so we use $exists: false check explicitly.
        const corruptedSessions = await UserSession.find({ isOnline: { $exists: false } });
        console.log(`[FixSessionData] Found ${corruptedSessions.length} sessions missing isOnline field.`);

        // 3. Update them
        // We set isOnline: false by default for old sessions, unless they look very recent (e.g. last 24h)
        // But for safety, let's just default to false (offline) so they don't ghost-appear.
        // Users can just log in again.

        const updateResult = await UserSession.updateMany(
            { isOnline: { $exists: false } },
            { $set: { isOnline: false, lastPing: new Date() } }
        );

        console.log(`[FixSessionData] Updated ${updateResult.modifiedCount} sessions.`);

        res.json({
            success: true,
            message: 'Session data repair completed',
            foundCorrupted: corruptedSessions.length,
            modified: updateResult.modifiedCount
        });
    } catch (error) {
        console.error('[FixSessionData] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fix session data',
            error: error.message
        });
    }
};
