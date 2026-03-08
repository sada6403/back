const jwt = require('jsonwebtoken');
const BranchManager = require('../models/BranchManager');
const FieldVisitor = require('../models/FieldVisitor');
const Analyzer = require('../models/Analyzer');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const fs = require('fs');
            const log = (msg) => {
                console.log(`[AUTH-B] ${msg}`);
            };
            log(`Verifying token for ${req.method} ${req.originalUrl}`);
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            log(`Token decoded: id=${decoded._id || decoded.id}, role=${decoded.role}`);
            console.log('Token decoded:', { id: decoded._id || decoded.id, role: decoded.role });

            // Load user by role
            const userIdToFind = decoded.id;
            // STRICT hex-24 check to prevent "Cast to ObjectId failed" errors
            const isValidObjectId = userIdToFind && userIdToFind.length === 24 && /^[0-9a-fA-F]{24}$/.test(userIdToFind);

            log(`Checking user: ${userIdToFind} (valid_oid=${isValidObjectId})`);

            if (decoded.role === 'manager') {
                if (isValidObjectId) {
                    req.user = await BranchManager.findById(userIdToFind).select('-password');
                }
                if (!req.user) {
                    req.user = await BranchManager.findOne({ userId: userIdToFind }).select('-password');
                }
                if (!req.user) {
                    console.error('Manager not found in DB for ID:', userIdToFind);
                    throw new Error('Manager not found');
                }
                req.user.role = 'manager';
            } else if (decoded.role === 'field_visitor') {
                if (isValidObjectId) {
                    req.user = await FieldVisitor.findById(userIdToFind).select('-password');
                }
                if (!req.user) {
                    req.user = await FieldVisitor.findOne({ userId: userIdToFind }).select('-password');
                }
                if (!req.user) {
                    console.error('Field visitor not found in DB for ID:', userIdToFind);
                    throw new Error('Field visitor not found');
                }
                req.user.role = 'field_visitor';
            } else if (decoded.role === 'it_sector' || decoded.role === 'it' || decoded.role === 'admin') {
                const ITSector = require('../models/ITSector');
                if (isValidObjectId) {
                    req.user = await ITSector.findById(userIdToFind).select('-password');
                }
                if (!req.user) {
                    req.user = await ITSector.findOne({ userId: userIdToFind }).select('-password');
                }
                if (!req.user) {
                    console.error('IT Sector user not found in DB for ID:', userIdToFind);
                    throw new Error('IT Sector user not found');
                }
                req.user.role = 'it_sector'; // Normalize to 'it_sector' for route authorization
            } else if (decoded.role === 'analyzer') {
                if (isValidObjectId) {
                    req.user = await Analyzer.findById(userIdToFind).select('-password');
                }
                if (!req.user) {
                    req.user = await Analyzer.findOne({ userId: userIdToFind }).select('-password');
                }
                if (!req.user) {
                    console.error('Analyzer not found in DB for ID:', userIdToFind);
                    throw new Error('Analyzer not found');
                }
                req.user.role = 'analyzer';
            } else {
                console.warn('Invalid role in token:', decoded.role);
                return res.status(401).json({ message: 'Not authorized, invalid role' });
            }

            // Attach branchId (prefer token payload, fallback to user document)
            req.user.branchId = decoded.branchId || req.user?.branchId || 'default-branch';
            console.log('Authenticated user:', req.user.userId || req.user.email);

            next();
        } catch (error) {
            const fs = require('fs');
            console.error('AUTH-B ERROR:', error.message);
            console.error('AUTH MIDDLEWARE ERROR:', error.message);
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({ message: `Not authorized, token invalid: ${error.message}` });
            }
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Not authorized, token expired' });
            }
            return res.status(401).json({ message: `Not authorized, token failed: ${error.message}` });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            const role = req.user?.role || 'unknown';
            return res.status(403).json({ message: `User role ${role} is not authorized to access this route` });
        }
        next();
    };
};

module.exports = { protect, authorize };
