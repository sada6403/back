/**
 * Role-based authorization middleware
 * Usage: router.get('/endpoint', requireRole('IT Sector', 'Admin'), handler)
 */
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const userRole = req.user.role;

        // Check if user's role is in the allowed roles
        const hasPermission = allowedRoles.some(role =>
            userRole && userRole.toLowerCase() === role.toLowerCase()
        );

        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Insufficient permissions.',
                requiredRoles: allowedRoles,
                userRole: userRole
            });
        }

        next();
    };
};

module.exports = { requireRole };
