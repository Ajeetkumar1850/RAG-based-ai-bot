
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Chat API
export const chatApi = {
  askQuestion: async (question, collegeId = 'default') => {
    try {
      const response = await api.post('/ask-question', {
        question,
        college_id: collegeId,
      });
      return response.data;
    } catch (error) {
      console.error('Error asking question:', error);
      throw error;
    }
  },
  
  uploadDocument: async (file, collegeId = 'default') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('college_id', collegeId);
    
    try {
      const response = await api.post('/upload-docs', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  },
};

export default api;