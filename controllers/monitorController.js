const UserSession = require('../models/UserSession');
const ActivityLog = require('../models/ActivityLog');
const { isWithinLastMinutes, formatSriLankaTime, getCurrentSriLankaTime, toSriLankaTime } = require('../utils/timezone');

/**
 * Get list of online users
 * GET /api/monitor/online-users
 */
const getOnlineUsers = async (req, res) => {
    try {
        const { role, branch, search } = req.query;

        // Build query
        const query = { isOnline: true };

        if (role) {
            query.role = role;
        }

        if (branch) {
            query.branchName = branch;
        }

        // Get all potentially online sessions
        let allSessions = await UserSession.find(query).lean();
        console.log(`[Monitor] Found ${allSessions.length} total potential sessions for query:`, query);

        // Filter by lastPing (within last 5 minutes for more stability)
        let sessions = allSessions.filter(session => {
            const within = isWithinLastMinutes(session.lastPing, 5);
            console.log(`[Monitor] Session for ${session.userId}: lastPing=${session.lastPing}, within=${within}`);
            return within;
        });
        console.log(`[Monitor] ${sessions.length} sessions remained after 5m heartbeat filter`);

        // Apply search filter if provided
        if (search) {
            const searchLower = search.toLowerCase();
            sessions = sessions.filter(session =>
                (session.username && session.username.toLowerCase().includes(searchLower)) ||
                (session.userId && session.userId.toLowerCase().includes(searchLower))
            );
        }

        // Format response with Sri Lanka timezone
        const formattedSessions = sessions.map(session => ({
            id: session.id,
            userId: session.userId,
            username: session.username,
            role: session.role,
            branchName: session.branchName,
            status: 'online',
            loginTime: formatSriLankaTime(session.loginTime),
            lastSeen: formatSriLankaTime(session.lastPing),
            deviceId: session.deviceId,
            platform: session.platform,
            appVersion: session.appVersion,
            deviceInfo: session.deviceInfo,
            currentScreen: session.currentScreen,
            durationMinutes: Math.floor((new Date() - new Date(session.loginTime)) / 60000)
        }));

        res.json({
            success: true,
            count: formattedSessions.length,
            data: formattedSessions
        });
    } catch (error) {
        console.error('[getOnlineUsers] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get online users',
            error: error.message
        });
    }
};

/**
 * Get activity logs
 * GET /api/monitor/activity-logs
 */
const getActivityLogs = async (req, res) => {
    try {
        const {
            userId,
            role,
            eventType,
            startDate,
            endDate,
            page = 1,
            limit = 50
        } = req.query;

        // Build query
        const query = {};

        if (userId) {
            query.userId = userId;
        }

        if (role) {
            query.role = role;
        }

        if (eventType) {
            query.eventType = eventType;
        }

        // Date range filter
        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) {
                query.timestamp.$gte = new Date(startDate);
            }
            if (endDate) {
                query.timestamp.$lte = new Date(endDate);
            }
        }

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Get logs
        const logs = await ActivityLog.find(query)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const totalCount = await ActivityLog.countDocuments(query);

        // Format response with Sri Lanka timezone
        const formattedLogs = logs.map(log => ({
            id: log.id,
            userId: log.userId,
            username: log.username,
            role: log.role,
            branchName: log.branchName,
            eventType: log.eventType,
            action: log.action,
            details: log.details,
            timestamp: formatSriLankaTime(log.timestamp),
            deviceId: log.deviceId,
            deviceInfo: log.deviceInfo,
            platform: log.platform,
            ipAddress: log.ipAddress
        }));

        res.json({
            success: true,
            count: formattedLogs.length,
            total: totalCount,
            page: parseInt(page),
            totalPages: Math.ceil(totalCount / parseInt(limit)),
            data: formattedLogs
        });
    } catch (error) {
        console.error('[getActivityLogs] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get activity logs',
            error: error.message
        });
    }
};

/**
 * Get monitoring statistics
 * GET /api/monitor/stats
 */
const getStats = async (req, res) => {
    try {
        // Get all potentially online sessions
        const allOnlineSessions = await UserSession.find({ isOnline: true }).lean();

        // Filter by lastPing (within last 5 minutes)
        const onlineSessions = allOnlineSessions.filter(session =>
            isWithinLastMinutes(session.lastPing, 5)
        );

        console.log(`[MonitorStats] All online in DB: ${allOnlineSessions.length}, filtered by 5m: ${onlineSessions.length}`);

        // Total online users
        const totalOnline = onlineSessions.length;

        // Online by role
        const onlineByRole = onlineSessions.reduce((acc, session) => {
            acc[session.role] = (acc[session.role] || 0) + 1;
            return acc;
        }, {});

        // Last 24h login count (match both casing just in case)
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const last24hLogins = await ActivityLog.countDocuments({
            eventType: { $in: ['login', 'LOGIN'] },
            timestamp: { $gte: last24h }
        });

        // Active sessions count (all sessions, not just online)
        const activeSessions = await UserSession.countDocuments({ isOnline: true });

        res.json({
            success: true,
            stats: {
                totalOnline,
                onlineByRole,
                last24hLogins,
                activeSessions,
                timestamp: formatSriLankaTime(new Date())
            }
        });
    } catch (error) {
        console.error('[getStats] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get stats',
            error: error.message
        });
    }
};

module.exports = {
    getOnlineUsers,
    getActivityLogs,
    getStats
};
