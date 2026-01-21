/**
 * GOLFCHARITY Draw Engine
 * Generates winning numbers based on score popularity
 */

/**
 * Analyzes score distribution and generates draw numbers
 * @param {Array} allScores - All scores from active subscribers
 * @param {number} rangeMin - Minimum score to consider (default: 1)
 * @param {number} rangeMax - Maximum score to consider (default: 45)
 * @returns {Object} Draw analysis results
 */
export function analyzeDrawPool(allScores, rangeMin = 1, rangeMax = 45) {
    // Filter scores within range
    const validScores = allScores.filter(s => s >= rangeMin && s <= rangeMax);

    if (validScores.length === 0) {
        return {
            winningNumbers: [],
            leastPopular: [],
            mostPopular: [],
            totalEntries: 0,
            frequency: {},
            error: 'No valid scores in range'
        };
    }

    // Count frequency of each score
    const frequency = {};
    validScores.forEach(score => {
        frequency[score] = (frequency[score] || 0) + 1;
    });

    // Sort by frequency (ascending for least popular first)
    const sorted = Object.entries(frequency)
        .sort((a, b) => a[1] - b[1]);

    // Get 3 least popular + 2 most popular
    const leastPopular = sorted.slice(0, 3).map(([score]) => parseInt(score));
    const mostPopular = sorted.slice(-2).map(([score]) => parseInt(score));

    // Combine and sort for display
    const winningNumbers = [...leastPopular, ...mostPopular].sort((a, b) => a - b);

    return {
        winningNumbers,
        leastPopular,
        mostPopular,
        totalEntries: validScores.length,
        uniqueScores: Object.keys(frequency).length,
        frequency
    };
}

/**
 * Check how many matches a user has against draw numbers
 * @param {Array} userScores - User's 5 scores
 * @param {Array} drawNumbers - The 5 winning numbers
 * @returns {Object} Match results
 */
export function checkMatches(userScores, drawNumbers) {
    const matches = userScores.filter(score => drawNumbers.includes(score));
    const uniqueMatches = [...new Set(matches)];

    return {
        count: uniqueMatches.length,
        matchedNumbers: uniqueMatches,
        isWinner: uniqueMatches.length >= 3
    };
}

/**
 * Calculate prize pool distribution
 * @param {number} activeSubscribers - Number of active paying subscribers
 * @param {number} jackpotCarryover - Any jackpot from previous month (default: 0)
 * @returns {Object} Prize pool breakdown
 */
export function calculatePrizePool(activeSubscribers, jackpotCarryover = 0) {
    const contributionPerUser = 5; // $5 per subscriber goes to prize pool
    const basePool = activeSubscribers * contributionPerUser;
    const totalPool = basePool + jackpotCarryover;

    return {
        basePool,
        jackpotCarryover,
        total: totalPool,
        fiveMatch: Math.round(totalPool * 0.40 * 100) / 100,   // 40%
        fourMatch: Math.round(totalPool * 0.35 * 100) / 100,   // 35%
        threeMatch: Math.round(totalPool * 0.25 * 100) / 100,  // 25%
        contributionPerUser
    };
}

/**
 * Simulate draw results for admin preview
 * @param {Array} allUserScores - Array of {userId, scores: [5 scores]}
 * @param {Array} drawNumbers - The proposed winning numbers
 * @param {Object} prizePool - Prize pool from calculatePrizePool
 * @returns {Object} Simulation results
 */
export function simulateDrawResults(allUserScores, drawNumbers, prizePool) {
    const results = {
        fiveMatch: [],
        fourMatch: [],
        threeMatch: [],
        noMatch: []
    };

    allUserScores.forEach(user => {
        const { count, matchedNumbers } = checkMatches(user.scores, drawNumbers);

        const result = {
            userId: user.userId,
            scores: user.scores,
            matchedNumbers,
            matchCount: count
        };

        if (count === 5) results.fiveMatch.push(result);
        else if (count === 4) results.fourMatch.push(result);
        else if (count === 3) results.threeMatch.push(result);
        else results.noMatch.push(result);
    });

    // Calculate payouts per tier
    const fiveMatchPayout = results.fiveMatch.length > 0
        ? Math.round((prizePool.fiveMatch / results.fiveMatch.length) * 100) / 100
        : 0;
    const fourMatchPayout = results.fourMatch.length > 0
        ? Math.round((prizePool.fourMatch / results.fourMatch.length) * 100) / 100
        : 0;
    const threeMatchPayout = results.threeMatch.length > 0
        ? Math.round((prizePool.threeMatch / results.threeMatch.length) * 100) / 100
        : 0;

    // Calculate jackpot (unclaimed 5-match pool)
    const jackpot = results.fiveMatch.length === 0 ? prizePool.fiveMatch : 0;

    return {
        winners: {
            fiveMatch: results.fiveMatch.length,
            fourMatch: results.fourMatch.length,
            threeMatch: results.threeMatch.length
        },
        payouts: {
            fiveMatch: fiveMatchPayout,
            fourMatch: fourMatchPayout,
            threeMatch: threeMatchPayout
        },
        jackpotRollover: jackpot,
        totalParticipants: allUserScores.length,
        totalWinners: results.fiveMatch.length + results.fourMatch.length + results.threeMatch.length,
        details: results
    };
}

/**
 * Validate a Stableford score
 * @param {number} score - The score to validate
 * @returns {Object} Validation result
 */
export function validateScore(score) {
    const numScore = parseInt(score);

    if (isNaN(numScore)) {
        return { valid: false, error: 'Score must be a number' };
    }
    if (numScore < 1) {
        return { valid: false, error: 'Score must be at least 1' };
    }
    if (numScore > 45) {
        return { valid: false, error: 'Score cannot exceed 45' };
    }

    return { valid: true, score: numScore };
}

/**
 * Format currency for display
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: AUD)
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, currency = 'AUD') {
    return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency
    }).format(amount);
}

// Score range presets for admin
export const SCORE_RANGE_PRESETS = [
    { label: 'Full Range (1-45)', min: 1, max: 45 },
    { label: 'Common (5-45)', min: 5, max: 45 },
    { label: 'Typical (10-40)', min: 10, max: 40 },
    { label: 'Conservative (15-38)', min: 15, max: 38 },
    { label: 'Narrow (18-36)', min: 18, max: 36 }
];
