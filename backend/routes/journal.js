const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const { getDB } = require("../db/database");
const { analyzeEmotion, analyzeEmotionStream } = require("../services/llmService");

const VALID_AMBIENCES = ["forest", "ocean", "mountain", "desert", "meadow"];

// ─── POST /api/journal ────────────────────────────────────────────────────────
router.post("/", (req, res) => {
  const { userId, ambience, text } = req.body;
  if (!userId || !ambience || !text)
    return res.status(400).json({ error: "userId, ambience, and text are required." });
  if (!VALID_AMBIENCES.includes(ambience))
    return res.status(400).json({ error: `ambience must be one of: ${VALID_AMBIENCES.join(", ")}` });
  if (text.trim().length < 5)
    return res.status(400).json({ error: "Journal entry is too short." });
  if (text.length > 5000)
    return res.status(400).json({ error: "Journal entry exceeds 5000 character limit." });

  try {
    const db = getDB();
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO journal_entries (id, user_id, ambience, text, created_at) VALUES (?, ?, ?, ?, ?)`)
      .run(id, userId, ambience, text.trim(), now);
    const entry = db.prepare("SELECT * FROM journal_entries WHERE id = ?").get(id);
    res.status(201).json(formatEntry(entry));
  } catch (err) {
    console.error("Error creating entry:", err);
    res.status(500).json({ error: "Failed to save journal entry." });
  }
});

// ─── POST /api/journal/analyze ───────────────────────────────────────────────
// NOTE: defined BEFORE /:userId to prevent route collision
router.post("/analyze", async (req, res) => {
  const { text, stream, entryId } = req.body;
  if (!text || text.trim().length < 5)
    return res.status(400).json({ error: "text is required and must be at least 5 characters." });

  if (stream) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    await analyzeEmotionStream(text, res);
    return;
  }

  try {
    const result = await analyzeEmotion(text);
    if (entryId) {
      const db = getDB();
      db.prepare(`UPDATE journal_entries SET emotion=?, keywords=?, summary=?, analyzed_at=? WHERE id=?`)
        .run(result.emotion, JSON.stringify(result.keywords), result.summary, new Date().toISOString(), entryId);
    }
    res.json(result);
  } catch (err) {
    console.error("Analysis error:", err);
    res.status(500).json({ error: err.message || "Analysis failed." });
  }
});

// ─── PATCH /api/journal/entry/:id/analyze ────────────────────────────────────
// NOTE: defined BEFORE /:userId to prevent route collision
router.patch("/entry/:id/analyze", async (req, res) => {
  const { id } = req.params;
  const db = getDB();

  let entry;
  try {
    entry = db.prepare("SELECT * FROM journal_entries WHERE id = ?").get(id);
  } catch (err) {
    console.error("DB lookup error:", err);
    return res.status(500).json({ error: "Database error: " + err.message });
  }

  if (!entry) return res.status(404).json({ error: `Entry not found: ${id}` });

  try {
    const result = await analyzeEmotion(entry.text);
    db.prepare(`UPDATE journal_entries SET emotion=?, keywords=?, summary=?, analyzed_at=? WHERE id=?`)
      .run(result.emotion, JSON.stringify(result.keywords), result.summary, new Date().toISOString(), id);
    const updated = db.prepare("SELECT * FROM journal_entries WHERE id = ?").get(id);
    res.json(formatEntry(updated));
  } catch (err) {
    console.error("Analysis error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/journal/insights/:userId ───────────────────────────────────────
// NOTE: defined BEFORE /:userId to prevent route collision
router.get("/insights/:userId", (req, res) => {
  const { userId } = req.params;
  const db = getDB();
  const entries = db.prepare("SELECT * FROM journal_entries WHERE user_id = ? ORDER BY created_at DESC").all(userId);

  if (entries.length === 0)
    return res.json({ totalEntries: 0, topEmotion: null, mostUsedAmbience: null, recentKeywords: [], emotionBreakdown: {}, ambienceBreakdown: {}, recentEntries: 0, analyzedEntries: 0 });

  const analyzed = entries.filter((e) => e.emotion);
  const emotionCount = {};
  analyzed.forEach((e) => { emotionCount[e.emotion] = (emotionCount[e.emotion] || 0) + 1; });
  const topEmotion = Object.entries(emotionCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  const ambienceCount = {};
  entries.forEach((e) => { ambienceCount[e.ambience] = (ambienceCount[e.ambience] || 0) + 1; });
  const mostUsedAmbience = Object.entries(ambienceCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  const recentKeywords = [...new Set(analyzed.slice(0, 5).flatMap((e) => { try { return JSON.parse(e.keywords || "[]"); } catch { return []; } }))].slice(0, 8);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  res.json({
    totalEntries: entries.length, topEmotion, mostUsedAmbience, recentKeywords,
    emotionBreakdown: emotionCount, ambienceBreakdown: ambienceCount,
    recentEntries: entries.filter((e) => e.created_at > weekAgo).length,
    analyzedEntries: analyzed.length,
  });
});

// ─── GET /api/journal/:userId ─────────────────────────────────────────────────
// NOTE: wildcard — must be LAST
router.get("/:userId", (req, res) => {
  const { userId } = req.params;
  const { limit = 20, offset = 0, ambience } = req.query;
  const db = getDB();

  let query = "SELECT * FROM journal_entries WHERE user_id = ?";
  const params = [userId];
  if (ambience && VALID_AMBIENCES.includes(ambience)) { query += " AND ambience = ?"; params.push(ambience); }
  query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  params.push(parseInt(limit), parseInt(offset));

  const entries = db.prepare(query).all(...params);
  const total = db.prepare(`SELECT COUNT(*) as count FROM journal_entries WHERE user_id = ?${ambience ? " AND ambience = ?" : ""}`)
    .get(...params.slice(0, ambience ? 2 : 1)).count;

  res.json({ entries: entries.map(formatEntry), total, limit: parseInt(limit), offset: parseInt(offset) });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatEntry(entry) {
  return {
    id: entry.id, userId: entry.user_id, ambience: entry.ambience, text: entry.text,
    emotion: entry.emotion || null,
    keywords: entry.keywords ? JSON.parse(entry.keywords) : [],
    summary: entry.summary || null,
    analyzedAt: entry.analyzed_at || null,
    createdAt: entry.created_at,
  };
}

module.exports = router;
