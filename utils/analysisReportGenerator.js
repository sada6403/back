const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');

const generateAnalysisReport = (sessions, activities, filters = {}) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 40, size: 'A4' });
            const reportsDir = path.join(__dirname, '..', 'public', 'reports');
            if (!fs.existsSync(reportsDir)) {
                fs.mkdirSync(reportsDir, { recursive: true });
            }

            const timestamp = moment().format('YYYYMMDD_HHmmss');
            const fileName = `Analysis_Report_${timestamp}.pdf`;
            const filePath = path.join(reportsDir, fileName);
            const writeStream = fs.createWriteStream(filePath);

            doc.pipe(writeStream);

            // -- CONSTANTS --
            const primaryColor = '#4682B4';
            const black = '#000000';
            const white = '#FFFFFF';
            const grey = '#555555';

            // Helper to format duration
            const formatDuration = (start, end) => {
                const endTime = end ? new Date(end) : new Date();
                const duration = endTime - new Date(start);
                if (duration < 0) return '0s';

                const seconds = Math.floor((duration / 1000) % 60);
                const minutes = Math.floor((duration / (1000 * 60)) % 60);
                const hours = Math.floor(duration / (1000 * 60 * 60));

                let parts = [];
                if (hours > 0) parts.push(`${hours}h`);
                if (minutes > 0) parts.push(`${minutes}m`);
                if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
                return parts.join(' ');
            };

            // 1. Header Section
            const logoPath = path.join(__dirname, '..', 'public', 'images', 'logo.jpg');
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, 40, 40, { width: 60 });
            }

            const headerY = 45;
            const leftX = 110;

            doc.fillColor(black).fontSize(18).font('Helvetica-Bold').text('Nature Farming - IT Sector', leftX, headerY);
            doc.fontSize(10).font('Helvetica')
                .text('System Usage & Activity Report', leftX, headerY + 22)
                .text(`Generated: ${moment().tz('Asia/Colombo').format('MMM DD, YYYY hh:mm A')}`, leftX, headerY + 37);

            doc.fillColor(primaryColor).fontSize(24).font('Helvetica-Bold')
                .text('ANALYSIS', 350, headerY, { align: 'right', width: 200 });

            doc.moveDown(3);

            // 2. Filter Info
            doc.fillColor(black).fontSize(10).font('Helvetica-Bold').text('Filters Applied:', 40, doc.y);
            doc.font('Helvetica').fontSize(9);
            if (filters.userId) doc.text(`- Member: ${filters.userId}`, 50, doc.y + 5);
            if (filters.startDate) doc.text(`- Start Date: ${filters.startDate}`, 50, doc.y + 5);
            if (filters.endDate) doc.text(`- End Date: ${filters.endDate}`, 50, doc.y + 5);
            if (!filters.userId && !filters.startDate && !filters.endDate) doc.text('- None (All Data)', 50, doc.y + 5);

            doc.moveDown(2);

            // 3. Login Sessions Table
            doc.fillColor(primaryColor).fontSize(14).font('Helvetica-Bold').text('Login Sessions', 40, doc.y);
            doc.moveDown(0.5);

            const tableTop = doc.y;
            const userColX = 40;
            const loginColX = 180;
            const logoutColX = 330;
            const durationColX = 480;

            // Bar
            doc.rect(40, tableTop, 515, 20).fill(primaryColor);
            doc.fillColor(white).fontSize(9).font('Helvetica-Bold');
            doc.text('USER', userColX + 5, tableTop + 6);
            doc.text('LOGIN TIME', loginColX + 5, tableTop + 6);
            doc.text('LOGOUT TIME', logoutColX + 5, tableTop + 6);
            doc.text('DURATION', durationColX + 5, tableTop + 6);

            let rowY = tableTop + 20;
            doc.fillColor(black).font('Helvetica').fontSize(8);

            sessions.forEach((s, i) => {
                if (rowY > 700) { doc.addPage(); rowY = 40; }

                const loginStr = moment(s.loginTime).tz('Asia/Colombo').format('MMM DD, hh:mm A');
                const logoutStr = s.logoutTime ? moment(s.logoutTime).tz('Asia/Colombo').format('MMM DD, hh:mm A') : 'Active';
                const durationStr = formatDuration(s.loginTime, s.logoutTime);

                doc.text(s.username || s.userId, userColX + 5, rowY + 6, { width: 130 });
                doc.text(loginStr, loginColX + 5, rowY + 6);
                doc.text(logoutStr, logoutColX + 5, rowY + 6);
                doc.text(durationStr, durationColX + 5, rowY + 6);

                doc.rect(40, rowY, 515, 18).strokeColor('#EEEEEE').stroke();
                rowY += 18;
            });

            doc.moveDown(3);

            // 4. Activity Log Table
            if (doc.y > 600) doc.addPage();

            doc.fillColor(primaryColor).fontSize(14).font('Helvetica-Bold').text('Activity Logs', 40, doc.y);
            doc.moveDown(0.5);

            const ActTableTop = doc.y;
            const ActUserColX = 40;
            const ActionColX = 140;
            const DetailsColX = 240;
            const TimeColX = 480;

            doc.rect(40, ActTableTop, 515, 20).fill(primaryColor);
            doc.fillColor(white).fontSize(9).font('Helvetica-Bold');
            doc.text('USER', ActUserColX + 5, ActTableTop + 6);
            doc.text('ACTION', ActionColX + 5, ActTableTop + 6);
            doc.text('DETAILS', DetailsColX + 5, ActTableTop + 6);
            doc.text('TIME', TimeColX + 5, ActTableTop + 6);

            let actRowY = ActTableTop + 20;
            doc.fillColor(black).font('Helvetica').fontSize(8);

            activities.forEach((a, i) => {
                if (actRowY > 700) { doc.addPage(); actRowY = 40; }

                const timeStr = moment(a.timestamp).tz('Asia/Colombo').format('hh:mm:ss A');

                doc.text(a.username || a.userId, ActUserColX + 5, actRowY + 6, { width: 95 });
                doc.text(a.action || '', ActionColX + 5, actRowY + 6, { width: 95 });
                doc.text(a.details || '', DetailsColX + 5, actRowY + 6, { width: 230 });
                doc.text(timeStr, TimeColX + 5, actRowY + 6);

                doc.rect(40, actRowY, 515, 18).strokeColor('#EEEEEE').stroke();
                actRowY += 18;
            });

            // Branding Footer
            doc.fillColor(grey).fontSize(8).font('Helvetica-Oblique')
                .text('Generated by NatureFarming Management System', 0, 800, { align: 'center' });

            doc.end();

            writeStream.on('finish', () => {
                resolve(`/reports/${fileName}`);
            });
            writeStream.on('error', (err) => {
                reject(err);
            });

        } catch (err) {
            reject(err);
        }
    });
};

module.exports = { generateAnalysisReport };
