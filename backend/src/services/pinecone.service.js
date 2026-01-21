const { Pinecone } = require('@pinecone-database/pinecone');

class PineconeService {
  constructor() {
    this.pinecone = null;
    this.index = null;
    this.indexName = 'college-rag';
    this.dimension = 768; // Gemini embedding dimension
  }

  /**
   * Initialize Pinecone client and index
   */
  async initialize() {
    try {
      // Initialize Pinecone client
      this.pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
      });

      console.log('✅ Pinecone client initialized');

      // Check if index exists, create if not
      const indexList = await this.pinecone.listIndexes();
      const indexExists = indexList.indexes?.some(idx => idx.name === this.indexName);

      if (!indexExists) {
        console.log(`📦 Creating index: ${this.indexName}...`);
        await this.pinecone.createIndex({
          name: this.indexName,
          dimension: this.dimension,
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-east-1'
            }
          }
        });
        console.log('✅ Index created successfully');
        
        // Wait for index to be ready
        await this.waitForIndexReady();
      }

      // Get index
      this.index = this.pinecone.index(this.indexName);
      console.log('✅ Connected to Pinecone index');

      return true;
    } catch (error) {
      console.error('❌ Pinecone initialization error:', error.message);
      throw error;
    }
  }

  /**
   * Wait for index to be ready
   */
  async waitForIndexReady() {
    console.log('⏳ Waiting for index to be ready...');
    let ready = false;
    let attempts = 0;
    const maxAttempts = 30;

    while (!ready && attempts < maxAttempts) {
      try {
        const indexList = await this.pinecone.listIndexes();
        const index = indexList.indexes?.find(idx => idx.name === this.indexName);
        
        if (index && index.status?.ready) {
          ready = true;
          console.log('✅ Index is ready');
        } else {
          await new Promise(resolve => setTimeout(resolve, 2000));
          attempts++;
        }
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
      }
    }

    if (!ready) {
      throw new Error('Index creation timeout');
    }
  }

  /**
   * Add vectors to Pinecone
   * @param {Array} vectors - Array of {id, values, metadata}
   */
  async upsert(vectors) {
    if (!this.index) {
      throw new Error('Pinecone not initialized. Call initialize() first.');
    }

    try {
      // Upsert in batches of 100
      const batchSize = 100;
      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);
        await this.index.upsert(batch);
      }

      console.log(`✅ Upserted ${vectors.length} vectors to Pinecone`);
      return true;
    } catch (error) {
      console.error('❌ Pinecone upsert error:', error.message);
      throw error;
    }
  }

  /**
   * Search for similar vectors
   * @param {Array} queryVector - Query embedding
   * @param {number} topK - Number of results
   * @param {Object} filter - Metadata filter
   */
  async query(queryVector, topK = 5, filter = {}) {
    if (!this.index) {
      throw new Error('Pinecone not initialized. Call initialize() first.');
    }

    try {
      const queryRequest = {
        vector: queryVector,
        topK: topK,
        includeMetadata: true,
      };

      // Add filter if provided
      if (Object.keys(filter).length > 0) {
        queryRequest.filter = filter;
      }

      const results = await this.index.query(queryRequest);

      // Format results
      const formattedResults = results.matches.map(match => ({
        id: match.id,
        score: match.score,
        metadata: match.metadata,
      }));

      return formattedResults;
    } catch (error) {
      console.error('❌ Pinecone query error:', error.message);
      throw error;
    }
  }

  /**
   * Delete vectors by IDs
   * @param {Array} ids - Vector IDs to delete
   */
  async delete(ids) {
    if (!this.index) {
      throw new Error('Pinecone not initialized. Call initialize() first.');
    }

    try {
      await this.index.deleteMany(ids);
      console.log(`✅ Deleted ${ids.length} vectors from Pinecone`);
      return true;
    } catch (error) {
      console.error('❌ Pinecone delete error:', error.message);
      throw error;
    }
  }

  /**
   * Delete all vectors for a college
   * @param {string} collegeId - College ID
   */
  async deleteByCollege(collegeId) {
    if (!this.index) {
      throw new Error('Pinecone not initialized. Call initialize() first.');
    }

    try {
      await this.index.deleteMany({
        filter: { collegeId: { $eq: collegeId } }
      });
      console.log(`✅ Deleted all vectors for college: ${collegeId}`);
      return true;
    } catch (error) {
      console.error('❌ Pinecone delete by college error:', error.message);
      throw error;
    }
  }

  /**
   * Get index stats
   */
  async getStats() {
    if (!this.index) {
      throw new Error('Pinecone not initialized. Call initialize() first.');
    }

    try {
      const stats = await this.index.describeIndexStats();
      return stats;
    } catch (error) {
      console.error('❌ Pinecone stats error:', error.message);
      throw error;
    }
  }
}

// Create singleton instance
const pineconeService = new PineconeService();

module.exports = pineconeService;
