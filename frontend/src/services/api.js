import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Ask a question to the RAG chatbot
 * @param {string} question - The question to ask
 * @param {string} collegeId - The college ID to query
 * @returns {Promise<{answer: string, confidence: number, sources: Array}>}
 */
export const askQuestion = async (question, collegeId = 'default') => {
  try {
    const response = await api.post('/chat', {
      question,
      collegeId,
    });
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.error || error.message || 'Failed to get answer';
    const statusCode = error.response?.status;
    
    throw {
      message: errorMessage,
      status: statusCode,
      isRateLimit: statusCode === 429,
      isServerError: statusCode >= 500,
    };
  }
};

/**
 * Upload a document for processing
 * @param {File} file - The file to upload
 * @param {string} collegeId - The college ID to associate with the document
 * @param {Function} onProgress - Progress callback (0-100)
 * @returns {Promise<{message: string, chunksCreated: number}>}
 */
export const uploadDocument = async (file, collegeId = 'default', onProgress = null) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('collegeId', collegeId);
  
  try {
    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.error || error.message || 'Failed to upload document';
    const statusCode = error.response?.status;
    
    throw {
      message: errorMessage,
      status: statusCode,
      isValidationError: statusCode === 400,
      isServerError: statusCode >= 500,
    };
  }
};

/**
 * Scrape a website and process its content
 * @param {string} url - The URL to scrape
 * @param {string} collegeId - The college ID to associate with the content
 * @returns {Promise<{message: string, chunksCreated: number}>}
 */
export const scrapeWebsite = async (url, collegeId = 'default') => {
  try {
    const response = await api.post('/scrape', {
      url,
      collegeId,
    });
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.error || error.message || 'Failed to scrape website';
    const statusCode = error.response?.status;
    
    throw {
      message: errorMessage,
      status: statusCode,
      isValidationError: statusCode === 400,
      isTimeout: statusCode === 503,
      isServerError: statusCode >= 500,
    };
  }
};

/**
 * Get list of documents for a college
 * @param {string} collegeId - The college ID to query
 * @returns {Promise<{documents: Array}>}
 */
export const getDocuments = async (collegeId = 'default') => {
  try {
    const response = await api.get('/documents', {
      params: { collegeId },
    });
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.error || error.message || 'Failed to get documents';
    const statusCode = error.response?.status;
    
    throw {
      message: errorMessage,
      status: statusCode,
      isServerError: statusCode >= 500,
    };
  }
};

export default api;