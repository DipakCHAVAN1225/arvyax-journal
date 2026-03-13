const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "../data/journal.db");

// Ensure data directory exists
const fs = require("fs");
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db;

function getDB() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
  }
  return db;
}

function initDB() {
  const database = getDB();

  database.exec(`
    CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      ambience TEXT NOT NULL CHECK(ambience IN ('forest', 'ocean', 'mountain', 'desert', 'meadow')),
      text TEXT NOT NULL,
      emotion TEXT,
      keywords TEXT,
      summary TEXT,
      analyzed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_journal_user_id ON journal_entries(user_id);
    CREATE INDEX IF NOT EXISTS idx_journal_created_at ON journal_entries(created_at);
    CREATE INDEX IF NOT EXISTS idx_journal_emotion ON journal_entries(emotion);

    CREATE TABLE IF NOT EXISTS analysis_cache (
      text_hash TEXT PRIMARY KEY,
      emotion TEXT NOT NULL,
      keywords TEXT NOT NULL,
      summary TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  console.log("✅ Database initialized");
}

module.exports = { getDB, initDB };
