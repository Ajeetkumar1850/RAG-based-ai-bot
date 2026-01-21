# 🚀 Quick Start Guide

## Setup (5 minutes)

### Step 1: Get API Key
1. Go to https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key

### Step 2: Configure
```bash
cd backend
cp .env.example .env
```
Edit `.env` and add your key:
```
GOOGLE_API_KEY=your_actual_key_here
```

### Step 3: Install & Run

**Terminal 1 - Backend:**
```bash
cd backend
npm install
npm start
```
Wait for: `✅ Server running on port 5000`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install
npm start
```
Browser opens at http://localhost:3000

### Step 4: Test

1. **Upload Data**
   - Click 📎 (paperclip icon)
   - Select `backend/NIE_PLACEMENT_INFO.txt`
   - Wait for "Document uploaded successfully"

2. **Ask Questions**
   ```
   Q: What is the placement rate for 2024-25?
   A: 74% with 210 companies visited
   
   Q: What is the highest package?
   A: ₹70 LPA for 2024-25 batch
   
   Q: Which companies recruit from NIE?
   A: TCS, Infosys, Amazon, Microsoft, Google...
   
   Q: What is the capital of Karnataka?
   A: I don't have information about that ✅
   ```

## That's It! 🎉

Your RAG chatbot is working with real NIE placement data!

## For Interview

**Show this:**
1. Upload NIE data
2. Ask about placements → Get accurate answer
3. Ask unrelated question → Says "not available"
4. Explain: "RAG ensures AI answers only from uploaded documents"

**Key points:**
- Uses Google Gemini (free)
- Vector search with embeddings
- No hallucinations
- Shows sources and confidence

## Troubleshooting

**Port 5000 already in use?**
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

**API key error?**
- Check `.env` file has correct key
- No spaces around `=`
- Key should start with `AIza...`

**Upload fails?**
- Check backend is running
- Check file is .txt, .pdf, or .docx
- Check browser console for errors

---

**Need help? Check README.md for full documentation**
