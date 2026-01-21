const fs = require('fs').promises;
const path = require('path');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const axios = require('axios');
const cheerio = require('cheerio');
const geminiService = require('./gemini.service');
const pineconeService = require('./pinecone.service');

/**
 * DocumentService - Process and store documents
 * Handles PDF, TXT, DOCX files and website scraping
 * Chunks text and generates embeddings for RAG
 * Uses Pinecone for vector storage
 */
class DocumentService {
  constructor() {
    // Chunking configuration
    this.chunkSize = 500; // words (approximately 400-600 tokens)
    this.chunkOverlap = 100; // words
  }

  /**
   * Load document based on file type
   * @param {string} filePath - Path to file
   * @param {string} fileType - File extension (pdf, txt, docx)
   * @returns {Promise<string>} - Extracted text
   */
  async loadDocument(filePath, fileType) {
    try {
      // Validate file type BEFORE attempting to read file
      const supportedTypes = ['pdf', 'txt', 'docx'];
      if (!supportedTypes.includes(fileType.toLowerCase())) {
        throw new Error(`Unsupported file type: ${fileType}`);
      }
      
      const buffer = await fs.readFile(filePath);
      
      switch (fileType.toLowerCase()) {
        case 'pdf':
          const pdfData = await pdf(buffer);
          return pdfData.text;
        
        case 'docx':
          const docxResult = await mammoth.extractRawText({ buffer });
          return docxResult.value;
        
        case 'txt':
          return buffer.toString('utf-8');
        
        default:
          // This should never be reached due to validation above
          throw new Error(`Unsupported file type: ${fileType}`);
      }
    } catch (error) {
      console.error(`Error loading ${fileType} document:`, error);
      throw error;
    }
  }

  /**
   * Scrape website content
   * @param {string} url - Website URL
   * @returns {Promise<string>} - Extracted text
   */
  async scrapeWebsite(url) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CollegeBot/1.0)'
        }
      });
      
      const $ = cheerio.load(response.data);
      
      // Remove unwanted elements
      $('script, style, nav, footer, header, aside, .advertisement, .ad').remove();
      
      // Extract main content
      const text = $('body').text();
      
      // Clean and normalize text
      return text
        .replace(/\s+/g, ' ')      // Multiple spaces to single space
        .replace(/\n+/g, '\n')     // Multiple newlines to single newline
        .trim();
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Website request timed out');
      }
      console.error('Error scraping website:', error);
      throw error;
    }
  }

  /**
   * Chunk text into smaller segments with overlap
   * @param {string} text - Text to chunk
   * @param {Object} metadata - Metadata for chunks
   * @returns {Array<Object>} - Array of chunks with metadata
   */
  chunkText(text, metadata = {}) {
    if (!text || typeof text !== 'string') {
      throw new Error('Text must be a non-empty string');
    }

    // Split into words
    const words = text.split(/\s+/).filter(word => word.length > 0);
    
    if (words.length === 0) {
      return [];
    }

    const chunks = [];
    const step = this.chunkSize - this.chunkOverlap;
    
    for (let i = 0; i < words.length; i += step) {
      const chunkWords = words.slice(i, i + this.chunkSize);
      const chunkText = chunkWords.join(' ');
      
      chunks.push({
        content: chunkText,
        metadata: {
          ...metadata,
          chunkIndex: chunks.length,
          totalChunks: 0, // Will be updated after loop
          startWord: i,
          endWord: i + chunkWords.length,
          wordCount: chunkWords.length
        }
      });
    }
    
    // Update total chunks count
    chunks.forEach(chunk => {
      chunk.metadata.totalChunks = chunks.length;
    });
    
    return chunks;
  }

  /**
   * Process document end-to-end: load, chunk, embed, store
   * @param {string} filePath - Path to document
   * @param {string} collegeId - College identifier
   * @returns {Promise<number>} - Number of chunks created
   */
  async processDocument(filePath, collegeId) {
    try {
      // 1. Extract text based on file type
      const fileType = path.extname(filePath).slice(1);
      const filename = path.basename(filePath);
      
      console.log(`📄 Processing ${filename} (${fileType})...`);
      
      const text = await this.loadDocument(filePath, fileType);
      
      if (!text || text.trim().length === 0) {
        throw new Error('No text content extracted from document');
      }
      
      console.log(`✅ Extracted ${text.length} characters`);
      
      // 2. Chunk text
      const chunks = this.chunkText(text, {
        filename,
        fileType,
        collegeId,
        uploadDate: new Date().toISOString()
      });
      
      console.log(`✂️  Created ${chunks.length} chunks`);
      
      // 3. Generate embeddings and store in Pinecone
      const vectors = [];
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        // Generate embedding
        const embedding = await geminiService.getEmbedding(chunk.content);
        
        // Prepare vector for Pinecone
        vectors.push({
          id: `${collegeId}_${filename}_${i}_${Date.now()}`,
          values: embedding,
          metadata: {
            ...chunk.metadata,
            content: chunk.content,
            collegeId: collegeId
          }
        });
        
        // Log progress
        if ((i + 1) % 5 === 0 || i === chunks.length - 1) {
          console.log(`📊 Progress: ${i + 1}/${chunks.length} chunks processed`);
        }
      }
      
      // 4. Upsert to Pinecone
      await pineconeService.upsert(vectors);
      
      console.log(`✅ Document processed successfully: ${chunks.length} chunks stored in Pinecone`);
      
      return chunks.length;
    } catch (error) {
      console.error('Error processing document:', error);
      throw error;
    }
  }

  /**
   * Process website content: scrape, chunk, embed, store
   * @param {string} url - Website URL
   * @param {string} collegeId - College identifier
   * @returns {Promise<number>} - Number of chunks created
   */
  async processWebsite(url, collegeId) {
    try {
      console.log(`🌐 Scraping website: ${url}...`);
      
      // 1. Scrape website
      const text = await this.scrapeWebsite(url);
      
      if (!text || text.trim().length === 0) {
        throw new Error('No text content extracted from website');
      }
      
      console.log(`✅ Extracted ${text.length} characters`);
      
      // 2. Chunk text
      const chunks = this.chunkText(text, {
        filename: url,
        fileType: 'website',
        collegeId,
        uploadDate: new Date().toISOString(),
        source: 'web'
      });
      
      console.log(`✂️  Created ${chunks.length} chunks`);
      
      // 3. Generate embeddings and store each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        // Generate embedding
        const embedding = await geminiService.getEmbedding(chunk.content);
        
        // Store in vector store
        await vectorStore.add(
          embedding,
          chunk.content,
          chunk.metadata,
          collegeId
        );
        
        // Log progress
        if ((i + 1) % 5 === 0 || i === chunks.length - 1) {
          console.log(`📊 Progress: ${i + 1}/${chunks.length} chunks processed`);
        }
      }
      
      // Save vector store to disk
      await vectorStore.saveToDisk();
      
      console.log(`✅ Website processed successfully: ${chunks.length} chunks`);
      
      return chunks.length;
    } catch (error) {
      console.error('Error processing website:', error);
      throw error;
    }
  }

  /**
   * Get list of documents for a college
   * @param {string} collegeId - College identifier
   * @returns {Array<Object>} - List of documents
   */
  getDocuments(collegeId) {
    return vectorStore.getDocuments(collegeId);
  }

  /**
   * Get statistics for a college
   * @param {string} collegeId - College identifier
   * @returns {Object} - Statistics
   */
  getStats(collegeId) {
    return vectorStore.getStats(collegeId);
  }
}

// Export singleton instance
module.exports = new DocumentService();
