# College RAG Chatbot - NIE Mysore

A RAG (Retrieval-Augmented Generation) chatbot that answers questions about NIE Mysore placements using official data.

## What is RAG?

**RAG = Retrieval + Augmented + Generation**

```
Student Question → Convert to Embedding → Search Documents 
→ Find Relevant Info → Generate Answer (from docs only)
```

**Result**: AI answers ONLY from uploaded documents - no hallucinations!

## Quick Start

### 1. Get API Keys (Both Free!)

**Gemini AI:**
- Go to: https://makersuite.google.com/app/apikey
- Click "Create API Key"
- Copy the key

**Pinecone (Vector Database):**
- Go to: https://app.pinecone.io/
- Sign up (FREE - no credit card!)
- Copy your API key from dashboard

### 2. Setup
```bash
# Backend
cd backend
cp .env.example .env
# Edit .env and add BOTH keys:
# GOOGLE_API_KEY=your_gemini_key
# PINECONE_API_KEY=your_pinecone_key

npm install
npm start

# Frontend (new terminal)
cd frontend
npm install
npm start
```

### 3. Use It
1. Open http://localhost:3000
2. Click 📎 (paperclip icon)
3. Upload `backend/NIE_PLACEMENT_INFO.txt`
4. Ask questions!

**Note**: First startup takes 1-2 minutes to create Pinecone index. Subsequent starts are instant.

## Sample Questions

```
✅ "What is the placement rate for 2024-25?"
✅ "What is the highest package?"
✅ "Which companies recruit from NIE?"
✅ "Who is the placement officer?"
✅ "What is the average package?"

❌ "What is the capital of Karnataka?"
   → Will say "I don't have information" (anti-hallucination!)
```

## Project Structure

```
college-rag-chatbot/
├── backend/
│   ├── src/
│   │   ├── services/
│   │   │   ├── geminiService.js      # Gemini API
│   │   │   ├── vectorStoreService.js # Vector search
│   │   │   ├── documentService.js    # Process docs
│   │   │   └── ragService.js         # RAG pipeline
│   │   ├── controllers/              # API handlers
│   │   └── routes/                   # API routes
│   ├── NIE_PLACEMENT_INFO.txt        # NIE data
│   └── server.js                     # Express server
│
└── frontend/
    └── src/
        ├── components/
        │   ├── ChatInterface.jsx     # Chat UI
        │   └── MessageBubble.jsx     # Messages
        ├── services/api.js           # API calls
        └── App.js                    # Main app
```

## Tech Stack

**Backend**: Node.js, Express, Gemini AI, **Pinecone**  
**Frontend**: React, Tailwind CSS  
**Vector Store**: **Pinecone (Production-grade, cloud-hosted)**  
**AI Models**: text-embedding-004, gemini-1.5-flash

## How RAG Works

1. **Upload Document**: NIE placement data → Split into chunks → Generate embeddings
2. **Ask Question**: "What is placement rate?" → Convert to embedding
3. **Search**: Find top 5 similar chunks using cosine similarity
4. **Generate**: AI answers using ONLY those chunks
5. **Display**: Answer + Confidence Score + Sources

## Key Features

✅ **Zero Cost**: Free Gemini API + Free Pinecone tier  
✅ **No Hallucinations**: Answers only from documents  
✅ **Source Attribution**: Shows which docs used  
✅ **Confidence Scores**: Shows AI confidence  
✅ **Real NIE Data**: Official placement statistics  
✅ **Production-Ready**: Pinecone vector database (scalable to millions of vectors)

## For Interview

### Demo Flow (2 minutes)
1. Start servers
2. Upload NIE_PLACEMENT_INFO.txt
3. Ask: "What is the placement rate?" → Shows 74%
4. Ask: "What is the capital of Karnataka?" → Says "not available" ✅
5. Explain: "This proves no hallucination - answers only from uploaded docs"

### Key Points
- **RAG prevents hallucinations** by grounding AI in your documents
- **Vector search** finds relevant chunks (cosine similarity)
- **Embeddings** convert text to 768-dim vectors
- **Confidence scores** show certainty
- **Source attribution** provides transparency

### Architecture
```
Question → Embedding → Vector Search → Top 5 Chunks 
→ Build Prompt → Gemini → Answer + Sources
```

### Why RAG?
- ✅ Cheaper than fine-tuning
- ✅ Instant updates (just upload new docs)
- ✅ Transparent (shows sources)
- ✅ Perfect for factual Q&A

## Troubleshooting

**Backend won't start?**
- Check `.env` has valid `GOOGLE_API_KEY`
- Make sure port 5000 is free

**No answers?**
- Upload NIE_PLACEMENT_INFO.txt first
- Check if question matches document content

**Rate limit errors?**
- Free tier: 15 requests/minute
- Wait a few seconds between questions

## NIE Data Includes

- Placement statistics (2021-2025)
- 238+ recruiting companies
- Highest package: ₹70 LPA
- Average package: ₹10.5 LPA
- Placement officer contact
- Training programs
- Student testimonials

## License

MIT - Free to use!

---

**Built with ❤️ for NIE Mysore students**
