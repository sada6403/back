const NodeCache = require("node-cache");

// default ttl of 5 minutes (300 seconds)
const myCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

/**
 * Simple cache wrapper
 * @param {string} key - Unique key for the cache
 * @param {Function} fetchFn - Function to fetch data if not in cache
 * @param {number} [ttl] - Optional TTL in seconds
 */
async function getOrSet(key, fetchFn, ttl) {
    const value = myCache.get(key);
    if (value) {
        // console.log(`[Cache] HIT: ${key}`);
        return value;
    }

    // console.log(`[Cache] MISS: ${key}`);
    const result = await fetchFn();
    myCache.set(key, result, ttl);
    return result;
}

/**
 * Deletes keys matching a pattern
 * @param {string} pattern - Pattern to match (e.g., 'dashboard_')
 */
function deleteByPattern(pattern) {
    const keys = myCache.keys();
    const toDelete = keys.filter(k => k.includes(pattern));
    if (toDelete.length > 0) {
        myCache.del(toDelete);
        // console.log(`[Cache] Invalidated ${toDelete.length} keys matching "${pattern}"`);
    }
}

module.exports = {
    getOrSet,
    deleteByPattern,
    cache: myCache
};
