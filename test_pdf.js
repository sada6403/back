const { generateAnalysisReport } = require('./utils/analysisReportGenerator');

const sessions = [
    { username: 'testuser1', loginTime: new Date(), logoutTime: new Date(Date.now() + 3600000) },
    { username: 'testuser2', loginTime: new Date(), logoutTime: new Date(Date.now() + 7200000) }
];

const activities = [
    { username: 'testuser1', action: 'LOGIN', details: 'User logged in successfully', timestamp: new Date() },
    { username: 'testuser2', action: 'UPDATE', details: 'Updated user profile information with new data and more data just to check string wrapping limit in pdf gen', timestamp: new Date() }
];

generateAnalysisReport(sessions, activities).then((url) => {
    console.log('Report generated at:', url);
}).catch((err) => {
    console.error('Error generating report:', err);
});
