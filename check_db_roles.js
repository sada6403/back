const mongoose = require('mongoose');

const uri = "mongodb+srv://cst23071_db_user:vgquPlo0tLETMjvK@cluster0.s8fljgu.mongodb.net/nf-farming?retryWrites=true&w=majority";

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        const UserSession = require('./models/UserSession');
        const ActivityLog = require('./models/ActivityLog');

        const analyzerSessions = await UserSession.countDocuments({ role: 'analyzer' });
        const analyzerActivities = await ActivityLog.countDocuments({ role: 'analyzer' });

        console.log('--- DB Data Check ---');
        console.log('Analyzer Sessions:', analyzerSessions);
        console.log('Analyzer Activities:', analyzerActivities);

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
