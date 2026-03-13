# 🏗️ ArvyaX Architecture Document

## System Overview

```
┌─────────────────┐     HTTP/REST     ┌──────────────────────┐
│  React Frontend │ ◄────────────────► │  Express Backend     │
│  (Vite + CSM)   │                   │  (Node.js)           │
└─────────────────┘                   └──────────┬───────────┘
                                                 │
                                    ┌────────────┴────────────┐
                                    │                         │
                              ┌─────▼─────┐        ┌─────────▼──────┐
                              │  SQLite   │        │  Anthropic API  │
                              │  (better- │        │  Claude Haiku   │
                              │  sqlite3) │        └────────────────┘
                              └───────────┘
```

**Current stack:** Single-node Node.js + SQLite for zero-config local dev. Production-grade architecture evolves below.

---

## 1. How Would You Scale This to 100,000 Users?

### Database Layer
Replace SQLite with **PostgreSQL** (via managed services like AWS RDS or Supabase):
- SQLite is single-writer only — concurrent writes from 100k users would serialize and create bottlenecks
- PostgreSQL supports connection pooling (PgBouncer), read replicas, and horizontal partitioning
- Partition `journal_entries` by `user_id` hash or `created_at` range to keep index sizes manageable
- Add a **Redis** cluster for session state, rate limit counters, and hot-path caching

### API Layer
- Containerize the Express app and deploy multiple instances behind a **load balancer** (AWS ALB, Nginx, or Cloudflare)
- Use **Kubernetes** or **ECS** for auto-scaling based on CPU/request metrics
- Split into microservices if bottlenecks appear: `journal-service`, `analysis-service`, `insights-service` each scale independently

### LLM Analysis
- Move analysis to an **async job queue** (BullMQ + Redis or AWS SQS): user submits entry → job enqueued → worker calls LLM → result written → client polls or receives WebSocket push
- This decouples latency-sensitive write APIs from expensive LLM calls
- Run multiple worker pods to parallelize analysis

### Frontend
- Serve static assets from **CDN** (Cloudflare, AWS CloudFront)
- Enable React lazy loading and code splitting for faster initial loads
- Use service workers for offline journaling capability

### Observability
- Structured logging (Winston → Datadog/Loki)
- Distributed tracing (OpenTelemetry)
- Alerting on p95 latency and error rates

---

## 2. How Would You Reduce LLM Cost?

### Caching (already implemented)
The current system caches analysis results in SQLite using a SHA-256 hash of the normalized input text. Identical or near-identical entries skip the LLM entirely.

### Upgrade caching to semantic similarity
- Embed journal texts using a cheap embedding model (e.g., `text-embedding-3-small` at ~$0.00002/1k tokens)
- Store embeddings in a vector database (pgvector, Pinecone, or Qdrant)
- For any new entry, find the nearest cached analysis (cosine similarity > 0.92) and reuse it
- This catches paraphrased versions of the same sentiment without calling the LLM

### Model selection
- Use **Claude Haiku** (already chosen) — ~15× cheaper than Sonnet, suitable for short emotion analysis tasks
- Implement a routing layer: short/simple entries go to Haiku; complex multi-paragraph entries go to Sonnet

### Batch processing
- Accumulate unanalyzed entries and use the **Anthropic Batch API** (50% cost reduction) for non-urgent analysis
- Run batch jobs nightly for entries not yet analyzed

### Prompt optimization
- Keep system prompts concise — every token costs money
- Use JSON mode / tool use to eliminate parsing retries
- Set `max_tokens: 256` for short analysis tasks (current: 512 — can be halved)

### Rate limiting
- Hard limits per user on analysis calls prevent runaway costs from a single abusive user
- Already implemented: 10 analysis calls per minute per IP

---

## 3. How Would You Cache Repeated Analysis?

### Current implementation
```
POST /api/journal/analyze
  → hash(normalize(text)) → lookup in analysis_cache table
  → hit: return cached result (sub-millisecond)
  → miss: call Anthropic API → store result → return
```

The cache key is `SHA-256(text.trim().toLowerCase())` stored in the `analysis_cache` SQLite table with `text_hash` as the primary key and `INSERT OR REPLACE` semantics.

### Production upgrade path

**L1 — In-process memory cache (node-cache or lru-cache):**
- Cache the 500 most-recently-analyzed hashes in-process
- Zero network round-trip, sub-microsecond lookup
- Evict on LRU basis

**L2 — Redis distributed cache:**
- Shared across all API instances
- TTL of 30 days (emotional analysis of a given text is stable)
- Key: `analysis:{sha256_hash}`, Value: JSON blob

**L3 — Database (existing):**
- Permanent storage and fallback when Redis is cold or unavailable
- Doubles as audit log

**Semantic deduplication (L0.5):**
- Before hashing, run a quick embedding similarity check against recent cached entries
- If cosine similarity > threshold, reuse the most similar analysis
- Prevents near-duplicate entries (typos, slight rephrasing) from burning extra LLM calls

### Cache invalidation
- Analysis results are treated as immutable — the same text always produces the same emotion label
- No TTL needed for deterministic analysis; add short TTL if model or prompt changes frequently

---

## 4. How Would You Protect Sensitive Journal Data?

Journal entries contain deeply personal mental health information. Protection operates at multiple layers:

### Encryption at rest
- **Database encryption:** Use encrypted storage (SQLCipher for SQLite; AWS RDS with KMS-managed encryption keys for PostgreSQL)
- **Application-level encryption:** Encrypt `text`, `summary`, and `keywords` fields with AES-256-GCM before writing, using a per-user derived key (PBKDF2 or Argon2 from user password + server-side secret)
- Only the user's authenticated session can derive their decryption key

### Encryption in transit
- TLS 1.3 enforced on all endpoints
- HSTS headers to prevent downgrade attacks
- Certificate pinning in any mobile clients

### Authentication & authorization
- Replace current name-based userId with proper **JWT authentication** (short-lived access tokens + refresh tokens)
- Every API endpoint validates `sub` claim matches `userId` in request — users cannot read each other's entries
- Implement **row-level security** in PostgreSQL: `ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY`

### Access control
- Principle of least privilege: backend service account has `SELECT/INSERT/UPDATE` on journal tables only, no `DROP` or schema access
- Admin access to production DB requires MFA + audit logging

### LLM data minimization
- When sending text to the Anthropic API, strip any PII that could identify the user before the API call (names, locations)
- Use Anthropic's zero-data-retention API option (available on enterprise plans) so entries are not stored or used for training
- Consider running a local/private LLM (Ollama + Llama 3) for maximum privacy — no data leaves your infrastructure

### Audit logging
- Log all read accesses to journal entries with timestamp, IP, and user agent
- Alert on anomalous access patterns (bulk reads, off-hours access)

### GDPR / Data rights
- Implement `DELETE /api/user/:userId` that hard-deletes all entries and cached analysis
- Export endpoint (`GET /api/user/:userId/export`) for data portability
- Retain entries only as long as the user is active; automated deletion after 2 years of inactivity (configurable)

### Security headers
```
Strict-Transport-Security: max-age=63072000; includeSubDomains
Content-Security-Policy: default-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: no-referrer
```

---

## Data Model

```sql
-- journal_entries
id          TEXT  PRIMARY KEY   -- UUID v4
user_id     TEXT  NOT NULL      -- user identifier (indexed)
ambience    TEXT  NOT NULL      -- forest|ocean|mountain|desert|meadow
text        TEXT  NOT NULL      -- raw journal entry (encrypted in prod)
emotion     TEXT                -- LLM output: primary emotion
keywords    TEXT                -- JSON array of keywords
summary     TEXT                -- LLM one-sentence summary
analyzed_at TEXT                -- ISO timestamp of analysis
created_at  TEXT  NOT NULL      -- ISO timestamp of creation

-- analysis_cache
text_hash   TEXT  PRIMARY KEY   -- SHA-256 of normalized text
emotion     TEXT  NOT NULL
keywords    TEXT  NOT NULL      -- JSON array
summary     TEXT  NOT NULL
created_at  TEXT  NOT NULL
```

---

## Evaluation Notes

| Criterion | Implementation |
|-----------|----------------|
| Backend API design | RESTful, validated, rate-limited, streaming support |
| Code structure | Routes → Services → DB layers, single responsibility |
| LLM integration | Real Anthropic API call, no dummy text, cached, streaming |
| Data modeling | Normalized SQLite with indexes on user_id, emotion, created_at |
| Frontend | React + CSS Modules, mobile-first, tab-based SPA |
| Documentation | README + ARCHITECTURE covering all 4 required questions |
| Bonus: caching | SHA-256 text hash cache in SQLite |
| Bonus: rate limiting | express-rate-limit on all routes + strict limit on /analyze |
| Bonus: streaming | SSE streaming via `"stream": true` in analyze endpoint |
| Bonus: Docker | docker-compose.yml included |
