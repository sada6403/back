const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const runDebug = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('CONNECTED');

        const pipeline = [
            { $match: { name: 'Sabi' } },
            {
                $lookup: {
                    from: 'fieldvisitors',
                    localField: 'fieldVisitorId',
                    foreignField: '_id',
                    as: 'fieldVisitor'
                }
            },
            {
                $project: {
                    name: 1,
                    fieldVisitorId: 1,
                    fvRaw: '$fieldVisitor',
                    // Simulate the logic used in controller
                    fieldVisitorName: {
                        $let: {
                            vars: { fv: { $arrayElemAt: ['$fieldVisitor', 0] } },
                            in: { $ifNull: ['$$fv.fullName', '$$fv.name'] }
                        }
                    }
                }
            }
        ];

        const result = await mongoose.connection.db.collection('members').aggregate(pipeline).toArray();
        console.log(JSON.stringify(result, null, 2));

        if (result.length > 0) {
            const m = result[0];
            console.log(`\nFieldVisitorID Type: ${m.fieldVisitorId ? m.fieldVisitorId.constructor.name : 'null'}`);
            if (m.fvRaw && m.fvRaw.length > 0) {
                const fv = m.fvRaw[0];
                console.log(`Matched FV ID Type: ${fv._id.constructor.name}`);
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};

runDebug();
