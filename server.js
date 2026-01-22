// server.js RECONSTRUCTED
process.env.PORT = process.env.PORT || 3000;
process.env.MONGODB_URI = 'mongodb+srv://cst23071_db_user:vgquPlo0tLETMjvK@cluster0.s8fljgu.mongodb.net/nf-farming?retryWrites=true&w=majority';
process.env.DB_PREFERENCE = 'atlas';
process.env.JWT_SECRET = 'nf_farming_secure_jwt_secret_key_2023_!@#';

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Import routes
console.log('Loading authRoutes...');
const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const memberRoutes = require('./routes/memberRoutes');
const fieldVisitorRoutes = require('./routes/fieldVisitorRoutes');
const productRoutes = require('./routes/productRoutes');
const reportRoutes = require('./routes/reportRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const noteRoutes = require('./routes/noteRoutes');
const managerRoutes = require('./routes/managerRoutes');
const itSectorRoutes = require('./routes/itSectorRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Import middleware
const errorHandler = require('./middleware/errorMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json());
app.use('/bills', express.static(path.join(__dirname, 'public', 'bills')));

// Request logging
app.use((req, res, next) => {
    console.log(`\n[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/fieldvisitors', fieldVisitorRoutes);
app.use('/api/products', productRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/managers', managerRoutes);
app.use('/api/it-sector', itSectorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/sms', require('./routes/smsRoutes')); // SMS Routes

app.get('/api/health', (req, res) => {
    res.status(200).json({ ok: true });
});

app.get('/', (req, res) => {
    res.send('API is running...');
});

// Debug endpoint to list all users (for testing)
app.get('/api/users', async (req, res) => {
    try {
        const BranchManager = require('./models/BranchManager');
        const FieldVisitor = require('./models/FieldVisitor');
        const Member = require('./models/Member');
        const ITSector = require('./models/ITSector');
        // const Admin = require('./models/Admin'); // Deprecated

        const managers = await BranchManager.find().select('-password');
        const fieldVisitors = await FieldVisitor.find().select('-password');
        const itSectors = await ITSector.find().select('-password');
        const members = await Member.find();
        // const admins = await Admin.find().select('-password');

        res.status(200).json({
            success: true,
            data: {
                managers: managers.map(m => ({
                    _id: m._id,
                    name: m.fullName || m.name,
                    email: m.email,
                    code: m.userId || m.code,
                    role: 'manager',
                    branchName: (m.branchName && m.branchName.includes('Kondavil')) ? 'Kondavil' :
                        (m.branchName && (m.branchName.includes('Chavakach') || m.branchName.includes('Chavagach'))) ? 'Chavakachcheri' :
                            m.branchName,
                    phone: m.phone,
                    gender: m.gender,
                    workExperience: m.workExperience,
                    references: m.references,
                    education: m.education,
                    dob: m.dob
                })),
                fieldVisitors: fieldVisitors.map(fv => ({
                    _id: fv._id,
                    name: fv.name || fv.fullName,
                    userId: fv.userId,
                    phone: fv.phone,
                    email: fv.email,
                    role: 'field_visitor',
                    status: fv.status,

                    // Added Fields for Management IT
                    branchName: (fv.area && fv.area.includes('Kondavil')) ? 'Kondavil' :
                        (fv.area && fv.area.includes('Chavakachcheri')) ? 'Chavakachcheri' :
                            (fv.area || fv.branchId),
                    assignedArea: fv.area,
                    bankDetails: fv.bankDetails,

                    // Personal & Other
                    dob: fv.dob,
                    nic: fv.nic,
                    civilStatus: fv.civilStatus,
                    gender: fv.gender,
                    postalAddress: fv.postalAddress,
                    permanentAddress: fv.permanentAddress,
                    education: fv.education,
                    workExperience: fv.workExperience,
                    references: fv.references
                })),
                itSectors: itSectors.map(it => ({
                    _id: it._id,
                    name: it.fullName || it.name,
                    email: it.email,
                    code: it.userId,
                    userId: it.userId,
                    phone: it.phone,
                    role: 'it_sector',
                    branchName: it.branchName,
                    status: it.status,
                    hasChangedPassword: it.hasChangedPassword,

                    // Extra fields
                    dob: it.createdAt,
                    nic: it.nic,
                    postalAddress: it.postalAddress,
                    permanentAddress: it.permanentAddress,
                    education: it.education,
                    gender: it.gender,
                    workExperience: it.workExperience,
                    references: it.references,

                    bankName: it.bankName,
                    bankBranch: it.bankBranch,
                    accountNo: it.accountNo,
                    accountHolder: it.accountHolder
                })),
                // Admins effectively mapped to IT Sectors now
                /*
                admins: admins.map(a => ({
                    _id: a._id,
                    name: a.fullName || a.name,
                    email: a.email,
                    code: a.userId,
                    userId: a.userId,
                    phone: a.phone,
                    role: 'admin',
                    branchName: a.branchName,
                    status: a.status
                })),
                */
                members: members.map(m => ({
                    _id: m._id,
                    id: m.id,
                    fullName: m.fullName || m.name,
                    mobile: m.mobile,
                    role: m.role,
                    status: m.status
                })),
                counts: {
                    managers: managers.length,
                    fieldVisitors: fieldVisitors.length,
                    itSectors: itSectors.length,
                    // admins: admins.length,
                    members: members.length
                }
            }
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching users',
            error: error.message
        });
    }
});

// DB Connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected to Atlas!');
    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
        process.exit(1);
    }
};

// Start Server
(async () => {
    await connectDB();
    const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server started on port ${PORT}`);
    });
    server.on('error', (e) => {
        console.error('SERVER LISTEN ERROR:', e);
        process.exit(1);
    });
})();
