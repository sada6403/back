const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const runDebug = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('CONNECTED');

        // 1. Get the specific failing ID from member 'ram'
        const member = await mongoose.connection.db.collection('members').findOne({ name: 'ram' });
        if (!member) {
            console.log('Member "ram" not found!');
            return;
        }

        const fvId = member.fieldVisitorId;
        console.log(`\nTARGET MEMBER: ${member.name}`);
        console.log(`FV ID in Member: ${fvId}`);
        console.log(`Type: ${typeof fvId}`);
        console.log(`Constructor: ${fvId?.constructor?.name}`);

        // 2. Search in fieldvisitors
        console.log('\n--- SEARCHING IN FIELDVISITORS ---');

        // As-is search
        const matchAsIs = await mongoose.connection.db.collection('fieldvisitors').findOne({ _id: fvId });
        console.log(`Match as-is: ${!!matchAsIs}`);

        // Try as ObjectId (if it was a string)
        let matchAsObjectId = null;
        try {
            const oid = new mongoose.Types.ObjectId(fvId.toString());
            matchAsObjectId = await mongoose.connection.db.collection('fieldvisitors').findOne({ _id: oid });
            console.log(`Match as ObjectId: ${!!matchAsObjectId}`);
        } catch (e) { console.log('Cannot cast to ObjectId'); }

        // Try as String (if it was stored as ObjectId but ID is string in FV collection)
        const matchAsString = await mongoose.connection.db.collection('fieldvisitors').findOne({ _id: fvId.toString() });
        console.log(`Match as String: ${!!matchAsString}`);

        // 3. List actual IDs in fieldvisitors to compare visually
        const allFVs = await mongoose.connection.db.collection('fieldvisitors').find({}).project({ _id: 1, name: 1 }).toArray();
        console.log('\n--- ACTUAL FIELD VISITORS ---');
        allFVs.forEach(fv => {
            console.log(`ID: ${fv._id} (Type: ${typeof fv._id}, Const: ${fv._id.constructor.name}) - Name: ${fv.name}`);
            if (fv._id.toString() === fvId.toString()) {
                console.log('  >>> VISUAL MATCH FOUND! Types might differ.');
            }
        });

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};

runDebug();
