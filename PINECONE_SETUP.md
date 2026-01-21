# Pinecone Setup Guide

## What is Pinecone?

Pinecone is a **production-grade vector database** that makes your RAG system:
- ✅ **Scalable**: Handle millions of vectors
- ✅ **Fast**: Sub-100ms queries
- ✅ **Reliable**: Cloud-hosted, always available
- ✅ **Free Tier**: 1 index, 100K vectors free forever

## Why Upgrade to Pinecone?

**Before (In-Memory):**
- ❌ Limited to ~10K documents
- ❌ Lost on server restart
- ❌ Slow for large datasets
- ❌ Single server only

**After (Pinecone):**
- ✅ Millions of documents
- ✅ Persistent storage
- ✅ Lightning fast
- ✅ Distributed, scalable

## Setup (5 minutes)

### Step 1: Create Pinecone Account

1. Go to https://app.pinecone.io/
2. Click "Sign Up" (FREE - no credit card!)
3. Verify your email
4. Login to dashboard

### Step 2: Get API Key

1. In Pinecone dashboard, click "API Keys" (left sidebar)
2. Copy your API key (starts with `pcsk_...`)
3. Save it securely

### Step 3: Configure Your Project

```bash
cd backend
cp .env.example .env
```

Edit `.env` and add both keys:
```env
GOOGLE_API_KEY=your_gemini_key_here
PINECONE_API_KEY=your_pinecone_key_here
```

### Step 4: Start Server

```bash
cd backend
npm start
```

You should see:
```
🔄 Initializing Pinecone...
✅ Pinecone client initialized
📦 Creating index: college-rag...
✅ Index created successfully
⏳ Waiting for index to be ready...
✅ Index is ready
✅ Connected to Pinecone index
✅ Server running on port 5000
🔗 Vector DB: Pinecone (Production-ready)
```

## How It Works

### 1. Document Upload
```
Upload NIE_PLACEMENT_INFO.txt
  ↓
Extract text → Chunk (500 words)
  ↓
Generate embeddings (Gemini)
  ↓
Store in Pinecone (cloud)
```

### 2. Question Answering
```
Student asks: "What is the placement rate?"
  ↓
Convert to embedding (Gemini)
  ↓
Search Pinecone (cosine similarity)
  ↓
Get top 5 relevant chunks
  ↓
Generate answer (Gemini)
```

## Pinecone Features Used

### Index Configuration
- **Name**: `college-rag`
- **Dimension**: 768 (Gemini embedding size)
- **Metric**: Cosine similarity
- **Cloud**: AWS (us-east-1)
- **Type**: Serverless (auto-scaling)

### Metadata Filtering
```javascript
// Search only for specific college
pinecone.query({
  vector: queryEmbedding,
  filter: { collegeId: { $eq: 'default' } },
  topK: 5
});
```

### Batch Operations
- Upserts in batches of 100 vectors
- Efficient bulk operations
- Progress tracking

## Free Tier Limits

**Pinecone Starter (Free Forever):**
- ✅ 1 index
- ✅ 100,000 vectors
- ✅ 2 million queries/month
- ✅ Serverless (auto-scaling)

**Perfect for:**
- College chatbot (< 10K vectors)
- Development & testing
- Small to medium deployments

## Monitoring

### Check Index Stats
```bash
# In your code
const stats = await pineconeService.getStats();
console.log(stats);
```

### Pinecone Dashboard
- View vector count
- Monitor queries
- Check performance
- Manage indexes

## Troubleshooting

### Error: "Pinecone not initialized"
**Solution**: Make sure `PINECONE_API_KEY` is in `.env` file

### Error: "Index creation timeout"
**Solution**: Wait 1-2 minutes, index is being created. Restart server.

### Error: "Invalid API key"
**Solution**: 
1. Check API key in Pinecone dashboard
2. Make sure it starts with `pcsk_`
3. No spaces in `.env` file

### Slow queries?
**Solution**: 
- Free tier is fast enough for most use cases
- Upgrade to paid tier for even faster queries
- Check your internet connection

## Comparison: In-Memory vs Pinecone

| Feature | In-Memory | Pinecone |
|---------|-----------|----------|
| **Capacity** | ~10K vectors | 100K+ vectors |
| **Speed** | Fast (local) | Very fast (optimized) |
| **Persistence** | JSON file | Cloud database |
| **Scalability** | Limited | Unlimited |
| **Reliability** | Single point | Distributed |
| **Cost** | Free | Free tier available |
| **Production** | ❌ Not recommended | ✅ Production-ready |

## Migration from In-Memory

Your project now uses Pinecone by default! The old in-memory vector store is still in the code but not used.

**What changed:**
1. `document.service.js` → Stores in Pinecone
2. `rag.service.js` → Searches Pinecone
3. `server.js` → Initializes Pinecone on startup

**What stayed same:**
- API endpoints (no changes)
- Frontend (no changes)
- Document processing (same logic)
- RAG pipeline (same flow)

## Advanced Features (Optional)

### Delete Documents
```javascript
// Delete all vectors for a college
await pineconeService.deleteByCollege('default');
```

### Custom Metadata
```javascript
// Add custom fields
metadata: {
  content: chunk.content,
  collegeId: 'default',
  department: 'CSE',
  year: 2024,
  category: 'placements'
}
```

### Filtered Search
```javascript
// Search only placement data
pinecone.query({
  vector: embedding,
  filter: { 
    collegeId: { $eq: 'default' },
    category: { $eq: 'placements' }
  }
});
```

## For Interview

**Interviewer**: "How would you scale this system?"

**You**: "I've already implemented Pinecone, a production-grade vector database. It:
- Handles millions of vectors (vs 10K in-memory)
- Provides sub-100ms queries
- Is cloud-hosted and distributed
- Has a free tier perfect for this use case
- Makes the system production-ready

The migration was seamless - same API, just swapped the storage layer."

## Next Steps

1. ✅ Get Pinecone API key
2. ✅ Add to `.env` file
3. ✅ Start server
4. ✅ Upload NIE data
5. ✅ Test queries
6. ✅ Monitor in Pinecone dashboard

---

**Your RAG system is now production-ready with Pinecone! 🚀**
