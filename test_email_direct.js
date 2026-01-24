const nodemailer = require('nodemailer');
require('dotenv').config();

const run = async () => {
    // Mimic exactly what emailService.js does
    const EMAIL_USER = process.env.EMAIL_USER || 'nfplantation.official.it@gmail.com';
    const EMAIL_PASS = process.env.EMAIL_PASS || 'ztfz bekz vozc nuf';

    console.log(`Attempting to send email from: ${EMAIL_USER}`);
    // Don't log the full password, but maybe length or first/last chars
    console.log(`Password length: ${EMAIL_PASS.length}`);

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASS
        }
    });

    const mailOptions = {
        from: `"Test Script" <${EMAIL_USER}>`,
        to: 'nfplantationsk@gmail.com', // The user's email
        subject: 'Test Email from Debug Script',
        text: 'If you receive this, the email configuration is working.'
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully!');
        console.log('Message ID:', info.messageId);
    } catch (error) {
        console.error('FAILED to send email:');
        console.error(error);
    }
};

run();
