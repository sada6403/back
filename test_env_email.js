const nodemailer = require('nodemailer');
require('dotenv').config();

const run = async () => {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    console.log(`Testing credentials from .env:`);
    console.log(`User: ${user}`);
    console.log(`Pass: ${pass}`);

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass }
    });

    try {
        await transporter.verify();
        console.log('Transporter configuration valid/ready!');

        const info = await transporter.sendMail({
            from: user,
            to: 'nfplantationsk@gmail.com',
            subject: 'Test Env Creds',
            text: 'It works!'
        });
        console.log('Email sent: ' + info.messageId);

    } catch (e) {
        console.error('FAILED:', e);
    }
};

run();
