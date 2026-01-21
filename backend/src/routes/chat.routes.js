const express = require('express');
const { handleChat, getCacheStats, clearCache } = require('../controllers/chat.controller');

const router = express.Router();

/**
 * Chat Routes
 * POST /chat - Handle chat/Q&A requests
 * GET /cache/stats - Get cache statistics
 * DELETE /cache - Clear cache
 */

// POST /chat - Handle chat request
router.post('/chat', handleChat);

// GET /cache/stats - Get cache statistics
router.get('/cache/stats', getCacheStats);

// DELETE /cache - Clear cache (optionally for specific college)
router.delete('/cache', clearCache);

module.exports = router;
