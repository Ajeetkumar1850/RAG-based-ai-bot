# Cache API Reference

## Endpoints

### 1. Get Cache Statistics
**GET** `/api/cache/stats`

Returns current cache statistics including hit rate, size, and most popular questions.

**Response:**
```json
{
  "success": true,
  "stats": {
    "size": 15,
    "maxSize": 100,
    "hits": 42,
    "misses": 18,
    "hitRate": "70%",
    "ttl": "3600s",
    "topQuestions": [
      {
        "question": "What is the placement rate?",
        "accessCount": 12,
        "age": "45s"
      }
    ]
  },
  "timestamp": "2026-01-21T14:20:18.831Z"
}
```

### 2. Clear All Cache
**DELETE** `/api/cache`

Clears all cached answers for all colleges.

**Response:**
```json
{
  "success": true,
  "message": "All cache cleared",
  "timestamp": "2026-01-21T14:20:18.831Z"
}
```

### 3. Clear College-Specific Cache
**DELETE** `/api/cache?collegeId=nie`

Clears cached answers for a specific college only.

**Response:**
```json
{
  "success": true,
  "message": "Cache cleared for nie",
  "timestamp": "2026-01-21T14:20:18.831Z"
}
```

## Chat Response with Cache Status

**POST** `/api/chat`

**Request:**
```json
{
  "question": "What is the placement rate?",
  "collegeId": "nie"
}
```

**Response (Cache Miss):**
```json
{
  "success": true,
  "answer": "The placement rate for 2024-25 is 74%...",
  "confidence": 0.85,
  "sources": [...],
  "retrievedChunks": 5,
  "cached": false,
  "responseTime": "2341ms",
  "timestamp": "2026-01-21T14:20:18.831Z"
}
```

**Response (Cache Hit):**
```json
{
  "success": true,
  "answer": "The placement rate for 2024-25 is 74%...",
  "confidence": 0.85,
  "sources": [...],
  "retrievedChunks": 5,
  "cached": true,
  "responseTime": "< 1ms",
  "timestamp": "2026-01-21T14:20:18.831Z"
}
```

## Testing with curl

```bash
# Get cache stats
curl http://localhost:5000/api/cache/stats

# Ask a question (first time - cache miss)
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the placement rate?", "collegeId": "nie"}'

# Ask same question (second time - cache hit)
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the placement rate?", "collegeId": "nie"}'

# Check stats again (should show 1 hit, 1 miss)
curl http://localhost:5000/api/cache/stats

# Clear all cache
curl -X DELETE http://localhost:5000/api/cache

# Clear specific college cache
curl -X DELETE "http://localhost:5000/api/cache?collegeId=nie"
```

## Cache Behavior

### What Gets Cached
- ✅ Answers with confidence >= 60%
- ✅ Question + college ID combination
- ✅ Full response (answer, confidence, sources)

### What Doesn't Get Cached
- ❌ Low confidence answers (< 60%)
- ❌ Error responses
- ❌ "Information not available" responses

### Cache Expiration
- **TTL**: 1 hour (3600 seconds)
- **Auto-eviction**: Oldest accessed items when cache is full
- **Max size**: 100 items

### Cache Key Generation
Questions are normalized before caching:
- Converted to lowercase
- Trimmed whitespace
- Multiple spaces collapsed to single space

**Example:**
```
"What is the PLACEMENT rate?"
"what is the placement rate?"
"What   is   the   placement   rate?"
```
All three are treated as the same question and share the same cache entry.

## Console Logs

### Cache Hit
```
🔍 Processing question for nie: "What is the placement rate?"
💾 Cache HIT: "What is the placement rate?"
   Hit rate: 70.0%
⚡ Returning cached answer (instant response)
```

### Cache Miss
```
🔍 Processing question for nie: "What is the highest package?"
✅ Generated query embedding (768 dimensions)
📚 Retrieved 5 chunks from Pinecone
🤖 Generating answer with Gemini...
✅ Answer generated (142 characters)
📊 Confidence score: 88.5%
⏱️  Response time: 2156ms
💾 Cache SET: "What is the highest package?"
   Cache size: 2/100
```

### Cache Clear
```
🗑️  Cache cleared: 15 items removed
```

## Performance Impact

| Scenario | Response Time | API Calls |
|----------|--------------|-----------|
| First query | 2-3 seconds | Gemini (2x) + Pinecone |
| Cached query | < 1ms | None |
| 100 repeat queries | < 100ms total | None |

**Cost Savings:**
- Gemini API: $0.00002 per request (embedding + generation)
- 100 cached queries save ~$0.002
- 10,000 cached queries save ~$0.20
- High-traffic scenarios: Significant savings

## When to Clear Cache

1. **After uploading new documents**: `DELETE /api/cache`
2. **After updating college data**: `DELETE /api/cache?collegeId=nie`
3. **For testing**: Clear before each test run
4. **Scheduled maintenance**: Clear daily/weekly for fresh data
5. **Manual refresh**: User requests latest information

## Integration with Frontend

```javascript
// Check if answer was cached
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ question, collegeId })
});

const data = await response.json();

if (data.cached) {
  console.log('⚡ Instant response from cache!');
} else {
  console.log(`🔍 Fresh answer in ${data.responseTime}`);
}

// Show cache stats to admin
const stats = await fetch('/api/cache/stats').then(r => r.json());
console.log(`Cache hit rate: ${stats.stats.hitRate}`);
```

## Monitoring

Track these metrics for cache performance:
- **Hit rate**: Should be > 50% for good performance
- **Cache size**: Monitor growth over time
- **Top questions**: Identify most common queries
- **Response time**: Compare cached vs non-cached

## Troubleshooting

**Problem**: Low hit rate (< 30%)
- **Solution**: Questions are too varied, consider fuzzy matching

**Problem**: Cache fills up quickly
- **Solution**: Increase maxSize or decrease TTL

**Problem**: Stale answers
- **Solution**: Decrease TTL or clear cache after updates

**Problem**: Memory usage high
- **Solution**: Reduce maxSize or implement Redis

---

**Cache system is ready! Test it with repeated questions to see instant responses.** ⚡
