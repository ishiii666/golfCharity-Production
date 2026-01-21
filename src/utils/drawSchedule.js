/**
 * Draw Schedule Configuration
 * Fixed draw schedule: 9th of every month at 8:00 PM EST
 * 
 * This module centralizes all draw timing logic to ensure consistency
 * across the entire application.
 */

// Draw schedule constants
export const DRAW_CONFIG = {
    DAY_OF_MONTH: 9,           // 9th of every month
    HOUR_EST: 20,              // 8:00 PM (20:00 in 24h format)
    MINUTE: 0,
    TIMEZONE: 'America/New_York', // EST/EDT timezone
    TIMEZONE_ABBR: 'EST',
    SCORE_CUTOFF_HOURS_BEFORE: 24, // Scores locked 24 hours before draw
};

/**
 * Get the next draw date in EST
 * @returns {Date} Next draw date
 */
export function getNextDrawDate() {
    const now = new Date();

    // Convert to EST
    const estNow = new Date(now.toLocaleString('en-US', { timeZone: DRAW_CONFIG.TIMEZONE }));

    // Start with current month's draw date
    let drawDate = new Date(estNow.getFullYear(), estNow.getMonth(), DRAW_CONFIG.DAY_OF_MONTH, DRAW_CONFIG.HOUR_EST, DRAW_CONFIG.MINUTE, 0);

    // If we've passed this month's draw, move to next month
    if (estNow > drawDate) {
        drawDate = new Date(estNow.getFullYear(), estNow.getMonth() + 1, DRAW_CONFIG.DAY_OF_MONTH, DRAW_CONFIG.HOUR_EST, DRAW_CONFIG.MINUTE, 0);
    }

    return drawDate;
}

/**
 * Get formatted next draw date string
 * @returns {string} e.g., "9th February 2026, 8:00 PM EST"
 */
export function getNextDrawDateFormatted() {
    const nextDraw = getNextDrawDate();
    return formatDrawDate(nextDraw);
}

/**
 * Format any draw date consistently
 * @param {Date} date - The draw date to format
 * @returns {string} e.g., "9th February 2026, 8:00 PM EST"
 */
export function formatDrawDate(date) {
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'long' });
    const year = date.getFullYear();

    // Add ordinal suffix
    const suffix = getOrdinalSuffix(day);

    return `${day}${suffix} ${month} ${year}, 8:00 PM ${DRAW_CONFIG.TIMEZONE_ABBR}`;
}

/**
 * Get short format for compact displays
 * @param {Date} date - The draw date
 * @returns {string} e.g., "Feb 9, 8PM EST"
 */
export function formatDrawDateShort(date) {
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'short' });

    return `${month} ${day}, 8PM ${DRAW_CONFIG.TIMEZONE_ABBR}`;
}

/**
 * Get ordinal suffix for a number
 * @param {number} n - The number
 * @returns {string} "st", "nd", "rd", or "th"
 */
function getOrdinalSuffix(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
}

/**
 * Check if scores can still be submitted
 * Scores are locked 24 hours before draw
 * @returns {boolean} True if scores can be submitted
 */
export function canSubmitScores() {
    const now = new Date();
    const nextDraw = getNextDrawDate();
    const cutoffTime = new Date(nextDraw.getTime() - (DRAW_CONFIG.SCORE_CUTOFF_HOURS_BEFORE * 60 * 60 * 1000));

    return now < cutoffTime;
}

/**
 * Get time until next draw
 * @returns {Object} { days, hours, minutes, seconds, isDrawDay }
 */
export function getTimeUntilDraw() {
    const now = new Date();
    const nextDraw = getNextDrawDate();
    const diff = nextDraw.getTime() - now.getTime();

    if (diff <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, isDrawDay: true };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return {
        days,
        hours,
        minutes,
        seconds,
        isDrawDay: days === 0 && hours === 0 && minutes === 0
    };
}

/**
 * Get countdown string
 * @returns {string} e.g., "5 days, 3 hours" or "Draw Today!"
 */
export function getCountdownString() {
    const { days, hours, minutes, isDrawDay } = getTimeUntilDraw();

    if (isDrawDay) return "Draw Today at 8PM EST!";
    if (days === 0 && hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''}, ${minutes} min`;
    if (days === 1) return `1 day, ${hours} hours`;
    return `${days} days, ${hours} hours`;
}

/**
 * Get the draw date for a specific month
 * @param {number} year - Year
 * @param {number} month - Month (0-11)
 * @returns {Date} Draw date for that month
 */
export function getDrawDateForMonth(year, month) {
    return new Date(year, month, DRAW_CONFIG.DAY_OF_MONTH, DRAW_CONFIG.HOUR_EST, DRAW_CONFIG.MINUTE, 0);
}

/**
 * Get draw month/year string (for database storage)
 * @param {Date} date - Optional date, defaults to next draw
 * @returns {string} e.g., "February 2026"
 */
export function getDrawMonthYear(date = null) {
    const drawDate = date || getNextDrawDate();
    return drawDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Static schedule description
 */
export const DRAW_SCHEDULE_TEXT = "Monthly draw held on the 9th of every month at 8:00 PM EST";
export const DRAW_SCHEDULE_SHORT = "9th of each month, 8PM EST";
