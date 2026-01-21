const geminiService = require('./gemini.service');
const pineconeService = require('./pinecone.service');
const cacheService = require('./cache.service');

/**
 * RAGService - Retrieval Augmented Generation
 * Orchestrates the RAG pipeline: retrieve, prompt, generate, validate
 * Uses Pinecone for vector search and caching for performance
 */
class RAGService {
  constructor() {
    this.similarityThreshold = 0.5; // Minimum similarity for relevant chunks
    this.topK = 5; // Number of chunks to retrieve
  }

  /**
   * Generate answer using RAG pipeline with caching
   * @param {string} question - User's question
   * @param {string} collegeId - College identifier
   * @returns {Promise<Object>} - Answer with confidence and sources
   */
  async generateAnswer(question, collegeId) {
    try {
      // Validate inputs
      if (!question || typeof question !== 'string' || question.trim().length === 0) {
        throw new Error('Question must be a non-empty string');
      }
      
      if (!collegeId || typeof collegeId !== 'string') {
        throw new Error('College ID must be a non-empty string');
      }

      console.log(`🔍 Processing question for ${collegeId}: "${question}"`);

      // 1. Check cache first
      const cachedAnswer = cacheService.get(question, collegeId);
      if (cachedAnswer) {
        console.log(`⚡ Returning cached answer (instant response)`);
        return {
          ...cachedAnswer,
          cached: true,
          responseTime: '< 1ms'
        };
      }

      const startTime = Date.now();

      // 1. Generate query embedding
      const queryEmbedding = await geminiService.getEmbedding(question);
      console.log(`✅ Generated query embedding (${queryEmbedding.length} dimensions)`);

      // 2. Retrieve similar chunks from Pinecone
      const results = await pineconeService.query(
        queryEmbedding,
        this.topK,
        { collegeId: { $eq: collegeId } }
      );
      
      console.log(`📚 Retrieved ${results.length} chunks from Pinecone`);
      
      if (results.length > 0) {
        console.log(`   Top similarity: ${results[0].score.toFixed(3)}`);
      }

      // 3. Check if relevant chunks found
      if (results.length === 0 || results[0].score < this.similarityThreshold) {
        console.log(`⚠️  No relevant chunks found (threshold: ${this.similarityThreshold})`);
        return {
          answer: "Sorry, this information is not available in the college records.",
          confidence: 0,
          sources: [],
          retrievedChunks: results.length
        };
      }

      // 4. Format chunks for prompt
      const similarChunks = results.map(result => ({
        content: result.metadata.content,
        similarity: result.score,
        metadata: result.metadata
      }));

      // 5. Build prompt with context
      const prompt = this.buildPrompt(question, similarChunks);

      // 6. Generate answer
      console.log(`🤖 Generating answer with Gemini...`);
      const answer = await geminiService.generateText(prompt);
      console.log(`✅ Answer generated (${answer.length} characters)`);

      // 7. Calculate confidence
      const confidence = this.calculateConfidence(answer, similarChunks);
      console.log(`📊 Confidence score: ${(confidence * 100).toFixed(1)}%`);

      // 8. Extract sources
      const sources = this.extractSources(similarChunks);

      // 9. Calculate response time
      const responseTime = Date.now() - startTime;
      console.log(`⏱️  Response time: ${responseTime}ms`);

      // 10. Prepare result
      const result = {
        answer,
        confidence,
        sources,
        retrievedChunks: similarChunks.length,
        cached: false,
        responseTime: `${responseTime}ms`
      };

      // 11. Cache the result (only if confidence is good)
      if (confidence >= 0.6) {
        cacheService.set(question, collegeId, result);
      }

      return result;
    } catch (error) {
      console.error('Error in RAG pipeline:', error);
      throw error;
    }
  }

  /**
   * Build RAG prompt with anti-hallucination rules
   * @param {string} question - User's question
   * @param {Array<Object>} chunks - Retrieved chunks
   * @returns {string} - Formatted prompt
   */
  buildPrompt(question, chunks) {
    // Format context with source attribution
    const context = chunks
      .map((chunk, index) => {
        const source = chunk.metadata.filename || 'Unknown source';
        return `[Source ${index + 1}: ${source}]\n${chunk.content}`;
      })
      .join('\n\n---\n\n');

    // Build prompt with strict anti-hallucination rules
    return `You are a helpful college information assistant. Answer the student's question using ONLY the provided context.

STRICT RULES:
1. Answer ONLY using the context below
2. If the answer is NOT in context, say EXACTLY: "Sorry, this information is not available in the college records."
3. Do NOT add any information not in context
4. Do NOT use general knowledge
5. If context has numbers or specific details, use them exactly
6. Be helpful and polite
7. Keep your answer concise and direct

CONTEXT:
${context}

STUDENT QUESTION:
${question}

ANSWER (Follow rules strictly):`;
  }

  /**
   * Calculate confidence score based on context overlap
   * @param {string} answer - Generated answer
   * @param {Array<Object>} chunks - Retrieved chunks
   * @returns {number} - Confidence score (0-1)
   */
  calculateConfidence(answer, chunks) {
    // If "not available" message, confidence is 0
    if (answer.toLowerCase().includes('not available')) {
      return 0;
    }

    // Extract significant words (4+ characters) from answer
    const answerWords = new Set(
      (answer.toLowerCase().match(/\b\w{4,}\b/g) || [])
    );

    if (answerWords.size === 0) {
      return 0;
    }

    // Extract significant words from context
    const contextWords = new Set(
      chunks.flatMap(chunk =>
        (chunk.content.toLowerCase().match(/\b\w{4,}\b/g) || [])
      )
    );

    // Calculate word overlap
    const overlap = [...answerWords].filter(word => contextWords.has(word)).length;
    
    // Calculate confidence as overlap ratio, capped at 0.95
    const confidence = Math.min(0.95, overlap / answerWords.size);

    return confidence;
  }

  /**
   * Extract sources from retrieved chunks
   * @param {Array<Object>} chunks - Retrieved chunks
   * @returns {Array<Object>} - Source information
   */
  extractSources(chunks) {
    // Group chunks by filename and aggregate similarity
    const sourceMap = new Map();

    chunks.forEach(chunk => {
      const filename = chunk.metadata.filename || 'Unknown';
      
      if (!sourceMap.has(filename)) {
        sourceMap.set(filename, {
          filename,
          fileType: chunk.metadata.fileType || 'unknown',
          relevance: chunk.similarity,
          chunkCount: 1
        });
      } else {
        const source = sourceMap.get(filename);
        source.relevance = Math.max(source.relevance, chunk.similarity);
        source.chunkCount++;
      }
    });

    // Convert to array and sort by relevance
    return Array.from(sourceMap.values())
      .sort((a, b) => b.relevance - a.relevance);
  }
}

// Export singleton instance
module.exports = new RAGService();
