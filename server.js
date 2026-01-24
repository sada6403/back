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

    app.get('/', (req, res) => res.send('API Running'));

    app.use(errorHandler);

    mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI)
        .then(() => {
            console.log('MongoDB Connected to Atlas!');
            app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
        })
        .catch(e => {
            console.error('DB Error:', e);
            process.exit(1);
        });

} catch (e) {
    console.error('CRASH:', e);
    process.exit(1);
}
