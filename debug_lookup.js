const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const runDebug = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('CONNECTED');

        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('COLLECTIONS:', collections.map(c => c.name).join(', '));

        const fvs = await mongoose.connection.db.collection('fieldvisitors').find({}).project({ _id: 1, name: 1, userId: 1 }).toArray();
        console.log('\n--- ALL FIELD VISITORS ---');
        fvs.forEach(fv => console.log(`ID: ${fv._id} | Name: ${fv.name} | UserID: ${fv.userId}`));

        const members = await mongoose.connection.db.collection('members').find({}).limit(5).project({ name: 1, fieldVisitorId: 1 }).toArray();
        console.log('\n--- SAMPLE MEMBERS ---');
        members.forEach(m => console.log(`Member: ${m.name} | FV_ID: ${m.fieldVisitorId}`));

        // Direct Lookup Test
        const lookup = await mongoose.connection.db.collection('members').aggregate([
            { $limit: 1 },
            {
                $lookup: {
                    from: 'fieldvisitors',
                    localField: 'fieldVisitorId',
                    foreignField: '_id',
                    as: 'fv'
                }
            },
            { $project: { fv_len: { $size: '$fv' } } }
        ]).toArray();
        console.log('\nLOOKUP TEST LEN:', lookup[0]?.fv_len);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};

runDebug();
