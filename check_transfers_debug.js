const mongoose = require('mongoose');
require('dotenv').config();

async function checkTransfers() {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        console.log('DB Connected');

        const CompanyTransfer = require('./models/CompanyTransfer');
        const transfers = await CompanyTransfer.find({}).limit(5);

        console.log('Transfers found:', transfers.length);
        console.log(JSON.stringify(transfers, null, 2));

        const roles = await CompanyTransfer.distinct('userRole');
        console.log('Distinct roles in transfers:', roles);

        const statuses = await CompanyTransfer.distinct('status');
        console.log('Distinct statuses in transfers:', statuses);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkTransfers();
