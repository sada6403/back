const ActivityLog = require('../models/ActivityLog');

/**
 * Middleware to restrict access for Analyst/Data Viewer roles.
 * Analysts are restricted to GET requests only on sensitive resources.
 */
const enforceRBAC = async (req, res, next) => {
    const role = req.user.role?.toLowerCase();
    const method = req.method;

    // List of roles that are restricted to view-only access
    const restrictedRoles = ['analyst', 'data_viewer', 'viewer'];

    if (restrictedRoles.includes(role)) {
        // Allow only GET and OPTIONS methods
        if (method !== 'GET' && method !== 'OPTIONS') {

            // Log the violation
            await ActivityLog.create({
                userId: req.user._id || req.user.userId,
                username: req.user.fullName || req.user.name || req.user.username,
                role: req.user.role,
                branchName: req.user.branchName || '',
                branchId: req.user.branchId || '',
                eventType: 'INVALID_ACTION_ATTEMPT',
                action: 'UNAUTHORIZED_MUTATION',
                details: `Blocked ${method} attempt on ${req.originalUrl}`,
                metadata: {
                    path: req.originalUrl,
                    method: method,
                    headers: req.headers['user-agent']
                },
                deviceId: req.body.deviceId,
                ipAddress: req.ip
            });

            return res.status(403).json({
                success: false,
                message: 'Access Denied: Your role is restricted to view-only access.'
            });
        }
    }

    next();
};

module.exports = { enforceRBAC };
