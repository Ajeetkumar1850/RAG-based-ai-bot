const ragService = require('../services/rag.service');
const cacheService = require('../services/cache.service');

/**
 * Chat Controller
 * Handles chat/Q&A requests and cache management
 */

/**
 * Handle chat request
 * POST /api/chat
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function handleChat(req, res) {
  try {
    const { question, collegeId } = req.body;

    // Validate required parameters
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Question is required and must be a non-empty string',
        code: 'MISSING_QUESTION',
        timestamp: new Date().toISOString()
      });
    }

    if (!collegeId || typeof collegeId !== 'string' || collegeId.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'College ID is required and must be a non-empty string',
        code: 'MISSING_COLLEGE_ID',
        timestamp: new Date().toISOString()
      });
    }

    // Call RAG service (with caching)
    const result = await ragService.generateAnswer(question, collegeId);

    // Return successful response
    return res.status(200).json({
      success: true,
      answer: result.answer,
      confidence: result.confidence,
      sources: result.sources,
      retrievedChunks: result.retrievedChunks,
      cached: result.cached || false,
      responseTime: result.responseTime,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in chat controller:', error);

    // Handle rate limit errors
    if (error.message === 'RATE_LIMIT_EXCEEDED') {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: 'Rate limit reached. Please wait a moment and try again.',
        suggestion: 'Consider using local Ollama for unlimited requests',
        code: 'RATE_LIMIT',
        timestamp: new Date().toISOString()
      });
    }

    // Handle other errors
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Get cache statistics
 * GET /api/cache/stats
 */
function getCacheStats(req, res) {
  try {
    const stats = cacheService.getStats();
    return res.status(200).json({
      success: true,
      stats: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get cache stats',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Clear cache
 * DELETE /api/cache
 */
function clearCache(req, res) {
  try {
    const { collegeId } = req.query;
    
    if (collegeId) {
      cacheService.clearCollege(collegeId);
    } else {
      cacheService.clear();
    }
    
    return res.status(200).json({
      success: true,
      message: collegeId ? `Cache cleared for ${collegeId}` : 'All cache cleared',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = {
  handleChat,
  getCacheStats,
  clearCache
};
