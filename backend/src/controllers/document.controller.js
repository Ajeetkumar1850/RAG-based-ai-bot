const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const documentService = require('../services/document.service');

/**
 * Document Controller
 * Handles file uploads, website scraping, and document management
 */

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Validate file type
    const allowedTypes = ['.pdf', '.txt', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}. Allowed types: ${allowedTypes.join(', ')}`));
    }
  }
}).single('file');

/**
 * Handle file upload
 * POST /api/upload
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function handleUpload(req, res) {
  // Use multer middleware
  upload(req, res, async (err) => {
    try {
      // Handle multer errors
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: 'File too large',
            message: 'File size exceeds 10MB limit',
            code: 'FILE_TOO_LARGE',
            timestamp: new Date().toISOString()
          });
        }
        return res.status(400).json({
          success: false,
          error: 'Upload failed',
          message: err.message,
          code: 'UPLOAD_ERROR',
          timestamp: new Date().toISOString()
        });
      } else if (err) {
        // Handle file type validation error
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: err.message,
          code: 'INVALID_FILE_TYPE',
          timestamp: new Date().toISOString()
        });
      }

      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: 'No file uploaded',
          code: 'MISSING_FILE',
          timestamp: new Date().toISOString()
        });
      }

      // Get collegeId from request
      const { collegeId } = req.body;

      if (!collegeId || typeof collegeId !== 'string' || collegeId.trim().length === 0) {
        // Clean up uploaded file
        await fs.unlink(req.file.path);
        
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: 'College ID is required',
          code: 'MISSING_COLLEGE_ID',
          timestamp: new Date().toISOString()
        });
      }

      // Process document
      const chunkCount = await documentService.processDocument(req.file.path, collegeId);

      // Clean up uploaded file after processing
      await fs.unlink(req.file.path);

      // Return success response
      return res.status(200).json({
        success: true,
        filename: req.file.originalname,
        chunks: chunkCount,
        message: `Document processed successfully: ${chunkCount} chunks created`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error in upload controller:', error);

      // Clean up file if it exists
      if (req.file && req.file.path) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.error('Error deleting file:', unlinkError);
        }
      }

      // Handle rate limit errors
      if (error.message === 'RATE_LIMIT_EXCEEDED') {
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          message: 'Rate limit reached. Please wait a moment and try again.',
          code: 'RATE_LIMIT',
          timestamp: new Date().toISOString()
        });
      }

      // Handle processing errors
      return res.status(500).json({
        success: false,
        error: 'Processing failed',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Failed to process document',
        code: 'PROCESSING_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  });
}

/**
 * Handle website scraping
 * POST /api/scrape
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function handleScrape(req, res) {
  try {
    const { url, collegeId } = req.body;

    // Validate URL
    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'URL is required and must be a non-empty string',
        code: 'MISSING_URL',
        timestamp: new Date().toISOString()
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (urlError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Invalid URL format',
        code: 'INVALID_URL',
        timestamp: new Date().toISOString()
      });
    }

    // Validate collegeId
    if (!collegeId || typeof collegeId !== 'string' || collegeId.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'College ID is required',
        code: 'MISSING_COLLEGE_ID',
        timestamp: new Date().toISOString()
      });
    }

    // Process website
    const chunkCount = await documentService.processWebsite(url, collegeId);

    // Return success response
    return res.status(200).json({
      success: true,
      url: url,
      chunks: chunkCount,
      message: `Website processed successfully: ${chunkCount} chunks created`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in scrape controller:', error);

    // Handle timeout errors
    if (error.message.includes('timeout') || error.code === 'ECONNABORTED') {
      return res.status(503).json({
        success: false,
        error: 'Network timeout',
        message: 'Website request timed out. Please try again.',
        code: 'TIMEOUT',
        timestamp: new Date().toISOString()
      });
    }

    // Handle network errors
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: 'Network error',
        message: 'Unable to reach website. Please check the URL and try again.',
        code: 'NETWORK_ERROR',
        timestamp: new Date().toISOString()
      });
    }

    // Handle rate limit errors
    if (error.message === 'RATE_LIMIT_EXCEEDED') {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: 'Rate limit reached. Please wait a moment and try again.',
        code: 'RATE_LIMIT',
        timestamp: new Date().toISOString()
      });
    }

    // Handle other errors
    return res.status(500).json({
      success: false,
      error: 'Processing failed',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Failed to process website',
      code: 'PROCESSING_ERROR',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Handle list documents request
 * GET /api/documents
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function handleListDocuments(req, res) {
  try {
    const { collegeId } = req.query;

    // Validate collegeId
    if (!collegeId || typeof collegeId !== 'string' || collegeId.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'College ID is required',
        code: 'MISSING_COLLEGE_ID',
        timestamp: new Date().toISOString()
      });
    }

    // Get documents and stats
    const documents = documentService.getDocuments(collegeId);
    const stats = documentService.getStats(collegeId);

    // Return success response
    return res.status(200).json({
      success: true,
      collegeId: collegeId,
      documents: documents,
      stats: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in list documents controller:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Failed to retrieve documents',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = {
  handleUpload,
  handleScrape,
  handleListDocuments
};
