const fs = require('fs').promises;
const path = require('path');

/**
 * VectorStoreService - In-memory vector storage with disk persistence
 * Stores document embeddings and performs cosine similarity search
 * Zero-cost solution - no external vector databases required
 */
class VectorStoreService {
  constructor() {
    // In-memory storage: { collegeId: [{ id, embedding, content, metadata }] }
    // Use Object.create(null) to avoid prototype pollution
    this.store = Object.create(null);
    
    // Path for persistence
    this.persistencePath = process.env.VECTOR_STORE_PATH || './data/vector_store.json';
    
    // Load existing data from disk
    this.loadFromDisk();
  }

  /**
   * Add a vector to the store
   * @param {number[]} embedding - Vector embedding (768-dimensional)
   * @param {string} content - Text content
   * @param {Object} metadata - Metadata (filename, chunkIndex, etc.)
   * @param {string} collegeId - College identifier
   */
  async add(embedding, content, metadata, collegeId) {
    // Initialize college collection if it doesn't exist or isn't an array
    if (!this.store[collegeId] || !Array.isArray(this.store[collegeId])) {
      this.store[collegeId] = [];
    }
    
    // Create vector entry
    const vectorEntry = {
      id: this.generateId(),
      embedding,
      content,
      metadata: {
        ...metadata,
        collegeId,
        addedAt: new Date().toISOString()
      }
    };
    
    // Add to store
    this.store[collegeId].push(vectorEntry);
    
    // Persist to disk periodically (every 10 additions)
    if (this.store[collegeId].length % 10 === 0) {
      await this.saveToDisk();
    }
    
    return vectorEntry.id;
  }

  /**
   * Search for similar vectors using cosine similarity
   * @param {number[]} queryEmbedding - Query vector
   * @param {string} collegeId - College identifier
   * @param {number} k - Number of results to return
   * @returns {Array<Object>} - Top k similar chunks with similarity scores
   */
  search(queryEmbedding, collegeId, k = 5) {
    // Get vectors for this college
    const collegeVectors = this.store[collegeId] || [];
    
    if (collegeVectors.length === 0) {
      return [];
    }
    
    // Calculate cosine similarity for all vectors
    const results = collegeVectors.map(item => ({
      id: item.id,
      content: item.content,
      metadata: item.metadata,
      similarity: this.cosineSimilarity(queryEmbedding, item.embedding)
    }));
    
    // Sort by similarity (descending) and return top k
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, k);
  }

  /**
   * Calculate cosine similarity between two vectors
   * Formula: cos(θ) = (A · B) / (||A|| * ||B||)
   * @param {number[]} vecA - First vector
   * @param {number[]} vecB - Second vector
   * @returns {number} - Similarity score between 0 and 1
   */
  cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      // Handle NaN values - treat as 0
      const a = isNaN(vecA[i]) ? 0 : vecA[i];
      const b = isNaN(vecB[i]) ? 0 : vecB[i];
      
      dotProduct += a * b;
      normA += a * a;
      normB += b * b;
    }
    
    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    
    // Handle zero magnitude (avoid division by zero)
    if (magnitude === 0) {
      return 0;
    }
    
    const similarity = dotProduct / magnitude;
    
    // Clamp to [0, 1] range to handle floating point errors
    return Math.max(0, Math.min(1, similarity));
  }

  /**
   * Get all documents for a college
   * @param {string} collegeId - College identifier
   * @returns {Array<Object>} - List of unique documents
   */
  getDocuments(collegeId) {
    const collegeVectors = this.store[collegeId] || [];
    
    // Extract unique documents
    const documentsMap = new Map();
    
    collegeVectors.forEach(item => {
      const filename = item.metadata.filename;
      if (!documentsMap.has(filename)) {
        documentsMap.set(filename, {
          filename,
          fileType: item.metadata.fileType,
          uploadDate: item.metadata.uploadDate,
          chunkCount: 0
        });
      }
      documentsMap.get(filename).chunkCount++;
    });
    
    return Array.from(documentsMap.values());
  }

  /**
   * Get statistics for a college
   * @param {string} collegeId - College identifier
   * @returns {Object} - Statistics
   */
  getStats(collegeId) {
    const collegeVectors = this.store[collegeId] || [];
    const documents = this.getDocuments(collegeId);
    
    return {
      totalChunks: collegeVectors.length,
      totalDocuments: documents.length,
      colleges: Object.keys(this.store).length
    };
  }

  /**
   * Save store to disk for persistence
   */
  async saveToDisk() {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.persistencePath);
      await fs.mkdir(dir, { recursive: true });
      
      // Write to disk
      await fs.writeFile(
        this.persistencePath,
        JSON.stringify(this.store, null, 2),
        'utf-8'
      );
      
      console.log(`✅ Vector store saved to ${this.persistencePath}`);
    } catch (error) {
      console.error('Error saving vector store to disk:', error);
      throw error;
    }
  }

  /**
   * Load store from disk
   */
  async loadFromDisk() {
    try {
      const data = await fs.readFile(this.persistencePath, 'utf-8');
      const parsed = JSON.parse(data);
      
      // Use Object.create(null) to avoid prototype pollution
      this.store = Object.create(null);
      Object.assign(this.store, parsed);
      
      const stats = {
        colleges: Object.keys(this.store).length,
        totalChunks: Object.values(this.store).reduce((sum, arr) => sum + arr.length, 0)
      };
      
      console.log(`✅ Vector store loaded from disk: ${stats.colleges} colleges, ${stats.totalChunks} chunks`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist yet, start with empty store
        console.log('📝 Starting with empty vector store');
        this.store = Object.create(null);
      } else {
        console.error('Error loading vector store from disk:', error);
        this.store = Object.create(null);
      }
    }
  }

  /**
   * Generate unique ID for vector entries
   * @returns {string} - Unique identifier
   */
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear all data for a college (useful for testing)
   * @param {string} collegeId - College identifier
   */
  async clear(collegeId) {
    if (collegeId) {
      delete this.store[collegeId];
    } else {
      this.store = Object.create(null);
    }
    await this.saveToDisk();
  }
}

// Export singleton instance
module.exports = new VectorStoreService();
