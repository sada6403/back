const mongoose = require('mongoose');
const Member = require('../models/Member');
const FieldVisitor = require('../models/FieldVisitor');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

async function mapUndefined() {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const undefinedFVs = await FieldVisitor.find({ fullName: { $in: [null, "undefined", ""] } }).lean();
        console.log(`Found ${undefinedFVs.length} undefined Field Visitors`);

        for (let fv of undefinedFVs) {
            // Search members assigned to this FV
            const members = await Member.find({
                $or: [
                    { fieldVisitorId: fv._id },
                    { field_visitor_id: fv.userId }
                ]
            }).lean();

            const namesFound = new Set();
            members.forEach(m => {
                if (m.field_visitor_name && m.field_visitor_name !== "undefined") {
                    namesFound.add(m.field_visitor_name);
                }
            });

            if (namesFound.size > 0) {
                console.log(`\nMatch for ${fv.userId}:`);
                console.log(`  Names in Members: ${Array.from(namesFound).join(', ')}`);
                console.log(`  Phone: ${fv.phone} | NIC: ${fv.nic}`);
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

mapUndefined();
