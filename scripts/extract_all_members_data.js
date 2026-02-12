const mongoose = require('mongoose');
const Member = require('../models/Member');
const fs = require('fs');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

async function extractMembers() {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const members = await Member.find({}).lean();
        console.log(`Extracting ${members.length} members...`);

        if (members.length === 0) {
            console.log('No members found.');
            return;
        }

        // Collect all possible keys from registrationData to form headers
        const regKeys = new Set();
        members.forEach(m => {
            if (m.registrationData) {
                Object.keys(m.registrationData).forEach(k => regKeys.add(k));
            }
        });

        const headers = [
            'memberCode', 'name', 'nic', 'mobile', 'address', 'branchId', 'branchName',
            'fieldVisitorId', 'field_visitor_name', 'status', 'joinedDate', 'registeredAt',
            ...Array.from(regKeys)
        ];

        let csvContent = headers.join(',') + '\n';

        members.forEach(m => {
            const row = headers.map(header => {
                let value = '';
                if (m[header] !== undefined) {
                    value = m[header];
                } else if (m.registrationData && m.registrationData[header] !== undefined) {
                    value = m.registrationData[header];
                }

                // Sanitize for CSV (handle commas and newlines)
                if (value === null || value === undefined) value = '';
                let stringValue = String(value).replace(/"/g, '""');
                return `"${stringValue}"`;
            });
            csvContent += row.join(',') + '\n';
        });

        fs.writeFileSync('all_members_data_export.csv', csvContent, 'utf8');
        console.log('Extraction complete! Data saved to all_members_data_export.csv');

    } catch (err) {
        console.error('Error during extraction:', err);
    } finally {
        await mongoose.disconnect();
    }
}

extractMembers();
