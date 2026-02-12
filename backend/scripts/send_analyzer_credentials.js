// Hardcoding env vars to bypass path/dotenv issues
process.env.MONGO_URI = 'mongodb+srv://cst23071_db_user:vgquPlo0tLETMjvK@cluster0.s8fljgu.mongodb.net/nf-farming?retryWrites=true&w=majority';
process.env.EMAIL_USER = 'nfplantation.official.it@gmail.com';
process.env.EMAIL_PASS = 'ytmu fovp dumq dtzq';

const path = require('path');
// require('dotenv').config(...) // Disabled
const mongoose = require('mongoose');
const Analyzer = require('../models/Analyzer');
const { sendEmail } = require('../utils/emailService');

const fs = require('fs');
const logFile = path.join(__dirname, 'email_debug.log');

function log(msg) {
    fs.appendFileSync(logFile, msg + '\n');
    console.log(msg);
}

async function sendCredentials() {
    try {
        log('Starting script...');
        log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        log('Connected.');

        const email = 'nfplantation31@gmail.com';
        log(`Finding user with email: ${email}`);
        const user = await Analyzer.findOne({ email });

        if (!user) {
            log('User not found!');
            process.exit(1);
        }

        log(`User found: ${user.fullName} (${user.userId})`);

        const password = 'Safna@31';
        const subject = 'Your Analyzer Account Credentials - NF Farming';
        const html = `...`; // (Keep html same, shortening for brevity in replacement if needed, but better keep it all)

        // ... (Define HTML again to be safe)
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2c5f2d;">Welcome to Nature Farming Management System</h2>
                <p>Hello ${user.fullName},</p>
                <p>Your Analyzer account has been created successfully. Please find your login credentials below:</p>
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>User ID:</strong> ${user.userId}</p>
                    <p style="margin: 5px 0;"><strong>Password:</strong> ${password}</p>
                    <p style="margin: 5px 0;"><strong>Role:</strong> Analyzer (Read-Only Access)</p>
                </div>
                <p>Please login and change your password if prompted.</p>
                <p style="color: #888; font-size: 12px;">This is an automated message.</p>
            </div>
        `;

        log('Sending email...');
        await sendEmail(email, subject, htmlContent);
        log('[SUCCESS] Email sent successfully to ' + email);

    } catch (error) {
        log('Error: ' + error.message);
        log('Stack: ' + error.stack);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
        log('Disconnected DB.');
        process.exit();
    }
}

sendCredentials();
