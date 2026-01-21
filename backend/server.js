const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const chatRoutes = require('./src/routes/chat.routes');
const documentRoutes = require('./src/routes/document.routes');
const pineconeService = require('./src/services/pinecone.service');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api', chatRoutes);
app.use('/api', documentRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'college-ai-backend',
    vectorDB: 'pinecone'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    code: 'NOT_FOUND',
    timestamp: new Date().toISOString()
  });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Rate limit error
  if (err.message === 'RATE_LIMIT_EXCEEDED') {
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      message: 'Rate limit reached. Please wait a moment and try again.',
      suggestion: 'Consider using local Ollama for unlimited requests',
      code: 'RATE_LIMIT',
      timestamp: new Date().toISOString()
    });
  }

  // Validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      message: err.message,
      code: 'VALIDATION_ERROR',
      timestamp: new Date().toISOString()
    });
  }

  // Default server error
  res.status(err.status || 500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    code: 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  });
});

// Start server with Pinecone initialization
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Initialize Pinecone
    console.log('🔄 Initializing Pinecone...');
    await pineconeService.initialize();
    
    // Start Express server
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`📚 API available at http://localhost:${PORT}/api`);
      console.log(`🩺 Health check: http://localhost:${PORT}/health`);
      console.log(`🔗 Vector DB: Pinecone (Production-ready)`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    console.error('💡 Make sure PINECONE_API_KEY is set in .env file');
    process.exit(1);
  }
}

startServer();