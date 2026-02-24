const mongoose = require('mongoose');

const uri = "mongodb+srv://cst23071_db_user:vgquPlo0tLETMjvK@cluster0.s8fljgu.mongodb.net/nf-farming?retryWrites=true&w=majority";

mongoose.connect(uri)
    .then(async () => {
        const db = mongoose.connection.useDb('nf-farming');
        const countSessions = await db.collection('usersessions').countDocuments({ role: 'analyzer' });
        const countLogs = await db.collection('activitylogs').countDocuments({ role: 'analyzer' });

        console.log('Analyzer Sessions:', countSessions);
        console.log('Analyzer Activities:', countLogs);

        const allRoleSessions = await db.collection('usersessions').aggregate([
            { $group: { _id: "$role", count: { $sum: 1 } } }
        ]).toArray();
        console.log('Session Roles:', allRoleSessions);

        const allRoleLogs = await db.collection('activitylogs').aggregate([
            { $group: { _id: "$role", count: { $sum: 1 } } }
        ]).toArray();
        console.log('Activity Roles:', allRoleLogs);

        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
