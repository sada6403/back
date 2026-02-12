const mongoose = require('mongoose');
require('dotenv').config();
const Analyzer = require('./models/Analyzer'); // Adjust path as needed

mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI)
    .then(async () => {
        console.log('Connected to DB');
        const analyzers = await Analyzer.find({});
        console.log(`Found ${analyzers.length} analyzers.`);

        for (const a of analyzers) {
            if (a.role !== 'Analyzer') {
                console.log(`Fixing role for ${a.fullName} from '${a.role}' to 'Analyzer'`);
                a.role = 'Analyzer';
                await a.save();
            }
        }
        console.log('Done.');
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
