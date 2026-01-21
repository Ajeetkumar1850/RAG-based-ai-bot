/**
 * CacheService - In-memory cache for frequently asked questions
 * Improves response time by caching answers
 */
class CacheService {
  constructor() {
    this.cache = new Map();
    this.maxSize = 100; // Maximum number of cached items
    this.ttl = 3600000; // Time to live: 1 hour in milliseconds
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Generate cache key from question and collegeId
   * @param {string} question - User's question
   * @param {string} collegeId - College identifier
   * @returns {string} - Cache key
   */
  generateKey(question, collegeId) {
    // Normalize question: lowercase, trim, remove extra spaces
    const normalized = question.toLowerCase().trim().replace(/\s+/g, ' ');
    return `${collegeId}:${normalized}`;
  }

  /**
   * Get cached answer
   * @param {string} question - User's question
   * @param {string} collegeId - College identifier
   * @returns {Object|null} - Cached answer or null
   */
  get(question, collegeId) {
    const key = this.generateKey(question, collegeId);
    const cached = this.cache.get(key);

    if (!cached) {
      this.misses++;
      return null;
    }

    // Check if expired
    const now = Date.now();
    if (now - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Cache hit
    this.hits++;
    cached.accessCount++;
    cached.lastAccessed = now;
    
    console.log(`💾 Cache HIT: "${question.substring(0, 50)}..."`);
    console.log(`   Hit rate: ${this.getHitRate()}%`);
    
    return cached.data;
  }

  /**
   * Set cached answer
   * @param {string} question - User's question
   * @param {string} collegeId - College identifier
   * @param {Object} answer - Answer data to cache
   */
  set(question, collegeId, answer) {
    const key = this.generateKey(question, collegeId);
    const now = Date.now();

    // Check cache size limit
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLeastUsed();
    }

    this.cache.set(key, {
      data: answer,
      timestamp: now,
      lastAccessed: now,
      accessCount: 1,
      question: question,
      collegeId: collegeId
    });

    console.log(`💾 Cache SET: "${question.substring(0, 50)}..."`);
    console.log(`   Cache size: ${this.cache.size}/${this.maxSize}`);
  }

  /**
   * Evict least recently used item
   */
  evictLeastUsed() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, value] of this.cache.entries()) {
      if (value.lastAccessed < oldestTime) {
        oldestTime = value.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`🗑️  Cache evicted: LRU item removed`);
    }
  }

  /**
   * Clear all cache
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    console.log(`🗑️  Cache cleared: ${size} items removed`);
  }

  /**
   * Clear cache for specific college
   * @param {string} collegeId - College identifier
   */
  clearCollege(collegeId) {
    let count = 0;
    for (const [key, value] of this.cache.entries()) {
      if (value.collegeId === collegeId) {
        this.cache.delete(key);
        count++;
      }
    }
    console.log(`🗑️  Cache cleared for ${collegeId}: ${count} items removed`);
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache stats
   */
  getStats() {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? ((this.hits / total) * 100).toFixed(2) : 0;

    // Get most accessed questions
    const items = Array.from(this.cache.values())
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10)
      .map(item => ({
        question: item.question,
        accessCount: item.accessCount,
        age: Math.floor((Date.now() - item.timestamp) / 1000) + 's'
      }));

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: `${hitRate}%`,
      ttl: `${this.ttl / 1000}s`,
      topQuestions: items
    };
  }

  /**
   * Get hit rate percentage
   * @returns {number} - Hit rate
   */
  getHitRate() {
    const total = this.hits + this.misses;
    return total > 0 ? ((this.hits / total) * 100).toFixed(1) : 0;
  }

  /**
   * Warm up cache with common questions
   * @param {Array} questions - Array of {question, collegeId, answer}
   */
  warmUp(questions) {
    console.log(`🔥 Warming up cache with ${questions.length} questions...`);
    questions.forEach(({ question, collegeId, answer }) => {
      this.set(question, collegeId, answer);
    });
    console.log(`✅ Cache warmed up: ${this.cache.size} items`);
  }

  /**
   * Get similar cached questions (fuzzy matching)
   * @param {string} question - User's question
   * @param {string} collegeId - College identifier
   * @returns {Array} - Similar cached questions
   */
  getSimilar(question, collegeId, threshold = 0.7) {
    const normalized = question.toLowerCase().trim();
    const similar = [];

    for (const [key, value] of this.cache.entries()) {
      if (value.collegeId !== collegeId) continue;

      const cachedQuestion = value.question.toLowerCase().trim();
      const similarity = this.calculateSimilarity(normalized, cachedQuestion);

      if (similarity >= threshold) {
        similar.push({
          question: value.question,
          similarity: similarity,
          accessCount: value.accessCount
        });
      }
    }

    return similar.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
  }

  /**
   * Calculate string similarity (simple word overlap)
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} - Similarity score (0-1)
   */
  calculateSimilarity(str1, str2) {
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }
}

// Create singleton instance
const cacheService = new CacheService();

module.exports = cacheService;
