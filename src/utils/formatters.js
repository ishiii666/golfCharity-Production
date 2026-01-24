/**
 * Utility formatters for GOLFCHARITY
 */

/**
 * Format currency for display
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: AUD)
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, currency = 'AUD') {
    return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

/**
 * Format large numbers with K/M suffix
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
export function formatCompactNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return num.toString();
}

/**
 * Format date in Australian format
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date
 */
export function formatDate(date) {
    const d = new Date(date);
    return new Intl.DateTimeFormat('en-AU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    }).format(d);
}

/**
 * Format date as relative time
 * @param {Date|string} date - Date to format
 * @returns {string} Relative time string
 */
export function formatRelativeTime(date) {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return formatDate(date);
}

/**
 * Get ordinal suffix for a number
 * @param {number} n - Number
 * @returns {string} Number with ordinal suffix
 */
export function ordinal(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Truncate text with ellipsis
 * @param {string} str - String to truncate
 * @param {number} length - Max length
 * @returns {string} Truncated string
 */
export function truncate(str, length = 100) {
    if (!str) return '';
    if (str.length <= length) return str;
    return str.slice(0, length).trim() + '...';
}

/**
 * Generate initials from a name
 * @param {string} name - Full name
 * @returns {string} Initials
 */
export function getInitials(name) {
    if (!name) return '?';
    return name
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

/**
 * Pluralize a word based on count
 * @param {number} count - Count
 * @param {string} singular - Singular form
 * @param {string} plural - Plural form (optional, adds 's' by default)
 * @returns {string} Pluralized word with count
 */
export function pluralize(count, singular, plural) {
    const word = count === 1 ? singular : (plural || singular + 's');
    return `${count} ${word}`;
}
