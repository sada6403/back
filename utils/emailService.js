const nodemailer = require('nodemailer');

// Email credentials from env or fallback (for DEV only)
const EMAIL_USER = process.env.EMAIL_USER || 'nfplantation.official.it@gmail.com';
const EMAIL_PASS = process.env.EMAIL_PASS || 'ztfz bekz vozc nuf'; // Replace with real app password if needed

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
    }
});

const sendEmail = async (to, subject, html) => {
    try {
        const mailOptions = {
            from: '"Nature Farming" <nfplantation.official.it@gmail.com>',
            to,
            subject,
            html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Message sent: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};

// Email template for password change notification
const sendPasswordChangeEmail = async (email, userId, newPassword) => {
    const subject = 'Password Changed Successfully - NF Farming';
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2c5f2d;">Password Changed Successfully</h2>
            <p>Your password has been changed successfully.</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>User ID:</strong> ${userId}</p>
                <p style="margin: 5px 0;"><strong>New Password:</strong> ${newPassword}</p>
            </div>
            <p style="color: #d9534f;"><strong>Important:</strong> Please keep this information secure and change your password after logging in.</p>
            <p>If you did not make this change, please contact IT support immediately.</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <p style="color: #888; font-size: 12px;">This is an automated message from NF Farming Management System.</p>
        </div>
    `;
    return await sendEmail(email, subject, html);
};

// Email template for password reset notification
const sendPasswordResetEmail = async (email, userId, newPassword) => {
    const subject = 'Password Reset Successful - NF Farming';
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2c5f2d;">Password Reset Successful</h2>
            <p>Your password has been reset successfully.</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>User ID:</strong> ${userId}</p>
                <p style="margin: 5px 0;"><strong>New Password:</strong> ${newPassword}</p>
            </div>
            <p style="color: #d9534f;"><strong>Important:</strong> Please keep this information secure and change your password after logging in.</p>
            <p>If you did not request this password reset, please contact IT support immediately.</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <p style="color: #888; font-size: 12px;">This is an automated message from NF Farming Management System.</p>
        </div>
    `;
    return await sendEmail(email, subject, html);
};

module.exports = { sendEmail, sendPasswordChangeEmail, sendPasswordResetEmail };

