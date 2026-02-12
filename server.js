require('dotenv').config();
const PORT = process.env.PORT || 3000;


const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

console.log('Starting Server...');

try {
    const authRoutes = require('./routes/authRoutes');
    const transactionRoutes = require('./routes/transactionRoutes');
    const memberRoutes = require('./routes/memberRoutes');
    const fieldVisitorRoutes = require('./routes/fieldVisitorRoutes');
    const productRoutes = require('./routes/productRoutes');
    const reportRoutes = require('./routes/reportRoutes');
    const notificationRoutes = require('./routes/notificationRoutes');
    const smsRoutes = require('./routes/smsRoutes');
    const noteRoutes = require('./routes/noteRoutes');
    const managerRoutes = require('./routes/managerRoutes');
    const employeeRoutes = require('./routes/employees');
    const sessionRoutes = require('./routes/sessionRoutes');
    const monitorRoutes = require('./routes/monitorRoutes');
    const errorHandler = require('./middleware/errorMiddleware');

    console.log('Routes Loaded');

    const app = express();
    app.use(cors({
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true
    }));
    app.use(express.json());
    app.use('/bills', express.static(path.join(__dirname, 'public', 'bills')));
    app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
    app.use('/reports', express.static(path.join(__dirname, 'public', 'reports')));

    app.use((req, res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
        next();
    });

    app.use('/api/auth', authRoutes);
    app.use('/api/transactions', transactionRoutes);
    app.use('/api/members', memberRoutes);
    app.use('/api/fieldvisitors', fieldVisitorRoutes);
    app.use('/api/products', productRoutes);
    app.use('/api/reports', reportRoutes);
    app.use('/api/notifications', notificationRoutes);
    app.use('/api/sms', smsRoutes);
    app.use('/api/bulk', require('./routes/bulkRoutes')); // Bulk Uploads
    app.use('/api/notes', noteRoutes);
    app.use('/api/managers', managerRoutes);
    app.use('/api/employees', employeeRoutes);
    app.use('/api/analysis', require('./routes/analysisRoutes'));
    app.use('/api/session', sessionRoutes);
    app.use('/api/session', sessionRoutes);
    app.use('/api/monitor', monitorRoutes);
    console.log('Mounting /api/monitor routes...'); // Debug log

    // API Ping (Diagnostic)
    app.get('/api/ping', (req, res) => res.json({
        success: true,
        message: 'Backend is live and updated',
        time: new Date().toISOString()
    }));

    app.get('/', (req, res) => res.send('API Running'));

    // Global API 404 Handler (MUST BE AFTER ALL ROUTES)
    app.use('/api', (req, res) => {
        res.status(404).json({
            success: false,
            message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
            error: 'Not Found'
        });
    });

    // General fallback 404
    app.use((req, res) => {
        res.status(404).json({
            success: false,
            message: `Route not found: ${req.method} ${req.originalUrl}`
        });
    });

    app.use(errorHandler);

    mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI)
        .then(() => {
            console.log('MongoDB Connected to Atlas!');
            app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));

            // Start background job to mark stale sessions offline
            startStaleSessionCleanup();
        })
        .catch(e => {
            console.error('DB Error:', e);
            process.exit(1);
        });

    // Background job: Mark stale sessions offline (no ping for 3+ minutes)
    function startStaleSessionCleanup() {
        const UserSession = require('./models/UserSession');
        const ActivityLog = require('./models/ActivityLog');
        const { calculateDurationMinutes } = require('./utils/timezone');

        setInterval(async () => {
            try {
                const threshold = new Date(Date.now() - 90 * 1000); // 90 seconds ago

                // Find sessions that are marked online but haven't pinged in 90s
                const staleSessions = await UserSession.find({
                    isOnline: true,
                    lastPing: { $lt: threshold }
                });

                for (const session of staleSessions) {
                    session.isOnline = false;
                    session.logoutTime = new Date();
                    session.durationMinutes = calculateDurationMinutes(session.loginTime, session.logoutTime);
                    await session.save();

                    // Log session timeout event
                    await ActivityLog.create({
                        userId: session.userId,
                        username: session.username,
                        role: session.role,
                        branchName: session.branchName,
                        eventType: 'session_timeout',
                        action: 'SESSION_TIMEOUT',
                        details: 'Session marked offline due to no ping for 90 seconds',
                        deviceId: session.deviceId,
                        deviceInfo: session.deviceInfo,
                        platform: session.platform,
                        ipAddress: session.ipAddress
                    });
                }

                if (staleSessions.length > 0) {
                    console.log(`[Cleanup] Marked ${staleSessions.length} stale sessions offline`);
                }
            } catch (error) {
                console.error('[Cleanup] Error marking stale sessions:', error);
            }
        }, 60 * 1000); // Run every 1 minute

        console.log('[Cleanup] Stale session cleanup job started (runs every 2 minutes)');
    }

} catch (e) {
    console.error('CRASH:', e);
    process.exit(1);
}
