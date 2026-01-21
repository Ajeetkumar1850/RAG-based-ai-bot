const express = require('express');
const { handleUpload, handleScrape, handleListDocuments } = require('../controllers/document.controller');

const router = express.Router();

/**
 * Document Routes
 * POST /upload - Upload and process document
 * POST /scrape - Scrape and process website
 * GET /documents - List documents for a college
 */

// POST /upload - Handle file upload
router.post('/upload', handleUpload);

// POST /scrape - Handle website scraping
router.post('/scrape', handleScrape);

// GET /documents - List documents
router.get('/documents', handleListDocuments);

module.exports = router;
