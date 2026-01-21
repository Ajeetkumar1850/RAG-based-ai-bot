const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * GeminiService - Interface with Google Gemini API (FREE TIER)
 * Handles text generation and embeddings with rate limiting
 * Free tier limits: 15 RPM (requests per minute)
 */
class GeminiService {
  constructor() {
    if (!process.env.GOOGLE_API_KEY) {
      console.warn('⚠️  GOOGLE_API_KEY not set. Gemini service will not work.');
    }
    
    this.apiKey = process.env.GOOGLE_API_KEY;
    this.genAI = new GoogleGenerativeAI(this.apiKey);
    
    // Text generation model (free tier)
    this.textModel = this.genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.1, // Low temperature for factual responses
        topK: 1,
        topP: 1,
        maxOutputTokens: 2048,
      }
    });
    
    // Embedding model (free tier)
    this.embeddingModel = this.genAI.getGenerativeModel({ 
      model: "text-embedding-004"
    });
    
    // Rate limiting (15 RPM = 4 seconds between requests)
    this.lastRequestTime = 0;
    this.minRequestInterval = 4000; // 4 seconds
    this.requestQueue = [];
  }

  /**
   * Rate limiting mechanism
   * Ensures we don't exceed 15 requests per minute
   */
  async rateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      console.log(`⏳ Rate limiting: waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Generate text embedding
   * @param {string} text - Text to embed
   * @returns {Promise<number[]>} - Embedding vector (768-dimensional)
   */
  async getEmbedding(text) {
    if (!text || typeof text !== 'string') {
      throw new Error('Text must be a non-empty string');
    }
    
    await this.rateLimit();
    
    try {
      const result = await this.embeddingModel.embedContent(text);
      const embedding = result.embedding.values;
      
      // Verify embedding dimensions
      if (!embedding || embedding.length === 0) {
        throw new Error('Empty embedding returned');
      }
      
      return embedding;
    } catch (error) {
      // Check for rate limit errors
      if (error.message && (error.message.includes('429') || error.message.includes('rate limit'))) {
        throw new Error('RATE_LIMIT_EXCEEDED');
      }
      
      // Check for API key errors
      if (error.message && error.message.includes('API key')) {
        throw new Error('INVALID_API_KEY');
      }
      
      console.error('Embedding error:', error);
      throw error;
    }
  }

  /**
   * Generate text response
   * @param {string} prompt - Prompt for generation
   * @returns {Promise<string>} - Generated text
   */
  async generateText(prompt) {
    if (!prompt || typeof prompt !== 'string') {
      throw new Error('Prompt must be a non-empty string');
    }
    
    await this.rateLimit();
    
    try {
      const result = await this.textModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      if (!text) {
        throw new Error('Empty response from model');
      }
      
      return text;
    } catch (error) {
      // Check for rate limit errors
      if (error.message && (error.message.includes('429') || error.message.includes('rate limit'))) {
        throw new Error('RATE_LIMIT_EXCEEDED');
      }
      
      // Check for API key errors
      if (error.message && error.message.includes('API key')) {
        throw new Error('INVALID_API_KEY');
      }
      
      // Check for safety/content filtering
      if (error.message && error.message.includes('SAFETY')) {
        return "Sorry, I cannot provide a response to that query due to content safety policies.";
      }
      
      console.error('Text generation error:', error);
      throw error;
    }
  }

  /**
   * Check if service is configured
   * @returns {boolean}
   */
  isConfigured() {
    return !!this.apiKey;
  }

  /**
   * Get service status
   * @returns {Object}
   */
  getStatus() {
    return {
      configured: this.isConfigured(),
      model: 'gemini-1.5-flash',
      embeddingModel: 'text-embedding-004',
      rateLimit: '15 RPM',
      lastRequest: this.lastRequestTime ? new Date(this.lastRequestTime).toISOString() : null
    };
  }
}

// Export singleton instance
module.exports = new GeminiService();
