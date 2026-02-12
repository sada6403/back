const moment = require('moment-timezone');

const SRI_LANKA_TZ = 'Asia/Colombo';

/**
 * Convert UTC date to Sri Lanka timezone
 * @param {Date|string} utcDate - UTC date object or ISO string
 * @returns {moment.Moment} - Moment object in Sri Lanka timezone
 */
function toSriLankaTime(utcDate) {
    return moment(utcDate).tz(SRI_LANKA_TZ);
}

/**
 * Get current time in Sri Lanka timezone
 * @returns {moment.Moment} - Current moment in Sri Lanka timezone
 */
function getCurrentSriLankaTime() {
    return moment().tz(SRI_LANKA_TZ);
}

/**
 * Format date in Sri Lanka timezone
 * @param {Date|string} date - Date to format
 * @param {string} format - Moment format string (default: 'YYYY-MM-DD HH:mm:ss')
 * @returns {string} - Formatted date string
 */
function formatSriLankaTime(date, format = 'YYYY-MM-DD HH:mm:ss') {
    return toSriLankaTime(date).format(format);
}

/**
 * Get ISO string in Sri Lanka timezone
 * @param {Date|string} date - Date to convert
 * @returns {string} - ISO string with timezone offset
 */
function toSriLankaISO(date) {
    return toSriLankaTime(date).toISOString(true); // true keeps the timezone offset
}

/**
 * Check if a timestamp is within the last N minutes
 * @param {Date|string} timestamp - Timestamp to check
 * @param {number} minutes - Number of minutes
 * @returns {boolean} - True if within last N minutes
 */
function isWithinLastMinutes(timestamp, minutes) {
    const now = getCurrentSriLankaTime();
    const then = toSriLankaTime(timestamp);
    const diffSeconds = now.diff(then, 'seconds');
    return diffSeconds <= (minutes * 60);
}

/**
 * Calculate duration between two timestamps in minutes
 * @param {Date|string} startTime - Start timestamp
 * @param {Date|string} endTime - End timestamp (default: now)
 * @returns {number} - Duration in minutes
 */
function calculateDurationMinutes(startTime, endTime = new Date()) {
    const start = moment(startTime);
    const end = moment(endTime);
    return end.diff(start, 'minutes');
}

module.exports = {
    SRI_LANKA_TZ,
    toSriLankaTime,
    getCurrentSriLankaTime,
    formatSriLankaTime,
    toSriLankaISO,
    isWithinLastMinutes,
    calculateDurationMinutes
};
