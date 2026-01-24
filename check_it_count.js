require('dotenv').config();
const mongoose = require('mongoose');
const ITSector = require('./models/ITSector');

const checkCount = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to DB');

        const count = await ITSector.countDocuments();
        console.log(`Live IT Sector Count in DB: ${count}`);

        const docs = await ITSector.find({}, 'fullName userId role');
        console.log('Documents:', docs);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkCount();
