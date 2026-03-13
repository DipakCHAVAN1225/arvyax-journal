const path = require("path");
// Load .env from the backend folder explicitly — works regardless of cwd
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const journalRoutes = require("./routes/journal");
const { initDB } = require("./db/database");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: "Too many requests, please try again later." },
});
const analyzeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { error: "Analysis rate limit exceeded. Please wait a moment." },
});

app.use("/api/", limiter);
app.use("/api/journal/analyze", analyzeLimiter);

// Routes
app.use("/api/journal", journalRoutes);

// Debug endpoint — shows config status (remove in production)
app.get("/api/debug", (req, res) => {
  const key = process.env.ANTHROPIC_API_KEY;
  res.json({
    apiKeySet: !!key,
    apiKeyLength: key ? key.length : 0,
    apiKeyPreview: key ? "AIza..." + key.slice(-6) + "..." : "NOT SET",
    nodeEnv: process.env.NODE_ENV || "development",
    cwd: process.cwd(),
    envFile: require("path").resolve(__dirname, ".env"),
    envFileExists: require("fs").existsSync(require("path").resolve(__dirname, ".env")),
  });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Initialize DB and start server
initDB();
app.listen(PORT, () => {
  const keyStatus = process.env.ANTHROPIC_API_KEY
    ? `✅ API key loaded (${process.env.ANTHROPIC_API_KEY.slice(0, 12)}...)`
    : "❌ WARNING: ANTHROPIC_API_KEY not set!";
  console.log(`🌿 ArvyaX Journal Server running on port ${PORT}`);
  console.log(`🔑 ${keyStatus}`);
});

module.exports = app;
