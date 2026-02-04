const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const runDebug = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

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
                    fvCount: { $size: '$fieldVisitor' },
                    firstFV: { $arrayElemAt: ['$fieldVisitor', 0] },
                    calculatedName: {
                        $let: {
                            vars: { fv: { $arrayElemAt: ['$fieldVisitor', 0] } },
                            in: { $ifNull: ['$$fv.fullName', '$$fv.name'] }
                        }
                    }
                }
            }
        ];

        const result = await mongoose.connection.db.collection('members').aggregate(pipeline).toArray();

        if (result.length > 0) {
            const m = result[0];
            console.log('Member:', m.name);
            console.log('FV ID:', m.fieldVisitorId);
            console.log('FV Count:', m.fvCount);
            console.log('Calculated Name:', m.calculatedName);
            if (m.firstFV) {
                console.log('FV FullName:', m.firstFV.fullName);
                console.log('FV Name:', m.firstFV.name);
            } else {
                console.log('No FV found in lookup.');
            }
        } else {
            console.log('Member Sabi not found.');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};

runDebug();
