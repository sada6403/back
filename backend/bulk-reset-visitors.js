const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

dotenv.config({ path: path.join(__dirname, '.env') });

const FieldVisitor = require('./models/FieldVisitor');

// Transporter setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Password generator
const generatePassword = () => {
    const numbers = "0123456789";
    const symbols = "!@#$%&*";
    const all = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

    let password = "NF";
    for (let i = 0; i < 4; i++) password += numbers.charAt(Math.floor(Math.random() * numbers.length));
    password += symbols.charAt(Math.floor(Math.random() * symbols.length));
    for (let i = 0; i < 2; i++) password += all.charAt(Math.floor(Math.random() * all.length));
    return password;
};

async function bulkReset() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const visitors = await FieldVisitor.find({});
        console.log(`Found ${visitors.length} Field Visitors. Starting reset...`);

        const startLink = "https://drive.google.com/file/d/1lTAELctnpWtzL0kVS_psZDI-5zP77-o3/view?usp=drive_link";
        let successCount = 0;

        for (const visitor of visitors) {
            if (!visitor.email) {
                console.log(`Skipping ${visitor.fullName} (${visitor.userId}) - No email.`);
                continue;
            }

            const plainPassword = generatePassword();
            const hashedPassword = await bcrypt.hash(plainPassword, 10);

            // Update user
            await FieldVisitor.updateOne(
                { _id: visitor._id },
                { $set: { password: hashedPassword } }
            );

            // Send Email
            const htmlContent = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: #1F2937; padding: 20px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0;">Nature Farming</h1>
                    </div>
                    <div style="padding: 30px; background-color: #ffffff;">
                        <h2 style="color: #333333; margin-top: 0;">Login Credentials Updated</h2>
                        <p style="color: #555555; line-height: 1.6;">Hello ${visitor.fullName},</p>
                        <p style="color: #555555; line-height: 1.6;">Your login credentials have been updated for the new application. Please use the following details to login:</p>
                        
                        <div style="background-color: #f8f9fa; border-left: 4px solid #4CAF50; padding: 15px; margin: 20px 0;">
                            <p style="margin: 5px 0;"><strong>User ID:</strong> ${visitor.userId}</p>
                            <p style="margin: 5px 0;"><strong>New Password:</strong> ${plainPassword}</p>
                            <p style="margin: 5px 0;"><strong>Role:</strong> ${visitor.role}</p>
                            <p style="margin: 5px 0;"><strong>Branch/Area:</strong> ${visitor.branchName || visitor.assignedArea || 'N/A'}</p>
                        </div>
                        
                        <p style="color: #555555; line-height: 1.6;">Please click the button below to access the application and documentation:</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${startLink}" style="background-color: #4CAF50; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Login Now</a>
                        </div>
                        
                        <p style="color: #888888; font-size: 12px; line-height: 1.6;">For security reasons, please change your password after logging in for the first time.</p>
                    </div>
                    <div style="background-color: #f1f1f1; padding: 15px; text-align: center;">
                        <p style="color: #888888; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} Nature Farming. All rights reserved.</p>
                    </div>
                </div>
            `;

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: visitor.email,
                subject: 'Important: Your New Login Credentials - Nature Farming',
                html: htmlContent
            };

            try {
                await transporter.sendMail(mailOptions);
                console.log(`Successfully reset and emailed: ${visitor.fullName} (${visitor.userId})`);
                successCount++;
            } catch (err) {
                console.error(`Failed to send email to ${visitor.email}:`, err);
            }
        }

        console.log(`\nResults: ${successCount}/${visitors.length} visitors updated and notified.`);
        process.exit(0);
    } catch (err) {
        console.error('Fatal Error:', err);
        process.exit(1);
    }
}

bulkReset();
