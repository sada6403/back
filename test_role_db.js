require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        const UserSession = require('./models/UserSession');
        const ActivityLog = require('./models/ActivityLog');

        const analyzerSessions = await UserSession.countDocuments({ role: 'analyzer' });
        const analyzerActivities = await ActivityLog.countDocuments({ role: 'analyzer' });

        console.log('--- DB Data Check ---');
        console.log('Analyzer Sessions:', analyzerSessions);
        console.log('Analyzer Activities:', analyzerActivities);

        // Let's also check for 'Analyzer', 'Analyst', 'it_sector'
        const rawSessions = await UserSession.aggregate([
            { $group: { _id: "$role", count: { $sum: 1 } } }
        ]);
        console.log('Session roles breakdown:', rawSessions);

        const rawActivities = await ActivityLog.aggregate([
            { $group: { _id: "$role", count: { $sum: 1 } } }
        ]);
        console.log('Activity roles breakdown:', rawActivities);

        process.exit(0);
    })
    .catch(err => {
        console.error('Error connecting to DB:', err);
        process.exit(1);
    });
