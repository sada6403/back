const mongoose = require('mongoose');
require('dotenv').config();
const Analyzer = require('../models/Analyzer');
const { sendEmail } = require('../utils/emailService');

const MONGO_URI = 'mongodb+srv://cst23071_db_user:vgquPlo0tLETMjvK@cluster0.s8fljgu.mongodb.net/nf-farming?retryWrites=true&w=majority';

async function registerNitheeshan() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('Connected.');

        const email = 'Nitheeshvijay8@gmail.com'.toLowerCase();
        const fullName = 'Selvarajah nitheeshan';
        const nic = '200330500181';
        const phone = '0702709559';
        const password = 'Nitheesh@2026';

        // Generate userId similar to authController
        const userId = 'AZ' + Date.now().toString().slice(-6);

        console.log(`Checking if user exists: ${email} or ${userId}`);
        const userExists = await Analyzer.findOne({
            $or: [{ email }, { userId }]
        });

        if (userExists) {
            console.error('User already exists!');
            process.exit(1);
        }

        console.log('Creating new Analyzer user...');
        const newUser = new Analyzer({
            fullName,
            email,
            password, // Model pre-save hook will hash this
            userId,
            phone,
            nic,
            role: 'analyzer',
            status: 'active',
            branchName: 'All',
            branchId: 'All'
        });

        const savedUser = await newUser.save();
        console.log('User registered successfully:', savedUser.userId);

        console.log('Sending credentials to email:', email);
        const subject = 'Your Analyzer Account Credentials - NF Farming';
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
                <h2 style="color: #2c5f2d; text-align: center;">Nature Farming Management System</h2>
                <p>Hello <strong>${fullName}</strong>,</p>
                <p>Your Analyzer account has been created successfully. You can now access the system with the following credentials:</p>
                <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px dashed #2c5f2d;">
                    <p style="margin: 5px 0;"><strong>User ID:</strong> <span style="color: #2c5f2d; font-size: 18px; font-family: monospace;">${savedUser.userId}</span></p>
                    <p style="margin: 5px 0;"><strong>Password:</strong> <span style="color: #2c5f2d; font-size: 18px; font-family: monospace;">${password}</span></p>
                    <p style="margin: 5px 0;"><strong>Role:</strong> Analyzer (Full Access)</p>
                </div>
                <p>Please log in and we recommend you change your password for security.</p>
                <p style="text-align: center; margin-top: 30px;">
                    <a href="https://naturefarming-it.web.app/login" style="background-color: #2c5f2d; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Login to System</a>
                </p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
                <p style="color: #888; font-size: 12px; text-align: center;">This is an automated message. Please do not reply.</p>
            </div>
        `;

        await sendEmail(email, subject, htmlContent);
        console.log('Email sent successfully!');

        process.exit(0);
    } catch (error) {
        console.error('Registration Error:', error);
        process.exit(1);
    }
}

registerNitheeshan();
