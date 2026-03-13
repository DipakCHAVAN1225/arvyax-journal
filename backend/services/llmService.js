const crypto = require("crypto");
const { getDB } = require("../db/database");

function getApiKey() {
  return (process.env.ANTHROPIC_API_KEY || "").trim();
}

function hashText(text) {
  return crypto.createHash("sha256").update(text.trim().toLowerCase()).digest("hex");
}

function getCachedAnalysis(text) {
  const db = getDB();
  const hash = hashText(text);
  const cached = db.prepare("SELECT * FROM analysis_cache WHERE text_hash = ?").get(hash);
  if (cached) {
    return { emotion: cached.emotion, keywords: JSON.parse(cached.keywords), summary: cached.summary, cached: true };
  }
  return null;
}

function cacheAnalysis(text, result) {
  const db = getDB();
  const hash = hashText(text);
  db.prepare(`INSERT OR REPLACE INTO analysis_cache (text_hash, emotion, keywords, summary) VALUES (?, ?, ?, ?)`)
    .run(hash, result.emotion, JSON.stringify(result.keywords), result.summary);
}

function parseResult(raw) {
  let clean = raw.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();
  const match = clean.match(/\{[\s\S]*\}/);
  if (match) clean = match[0];
  let result;
  try { result = JSON.parse(clean); }
  catch (e) { throw new Error("Could not parse as JSON: " + raw.slice(0, 200)); }
  if (!result.emotion || !Array.isArray(result.keywords) || !result.summary) {
    throw new Error("Missing fields: " + JSON.stringify(result));
  }
  result.emotion = String(result.emotion).toLowerCase().trim();
  result.keywords = result.keywords.map(k => String(k).toLowerCase().trim()).slice(0, 6);
  result.summary = String(result.summary).trim();
  return result;
}

// ── Rule-based fallback — works with zero API calls ───────────────────────────
function localAnalyze(text) {
  const t = text.toLowerCase();
  const emotionMap = [
    { emotion: "joyful",      words: ["happy","joy","wonderful","amazing","great","love","excited","delight","smile","laugh","fantastic","elated"] },
    { emotion: "calm",        words: ["calm","peace","quiet","still","serene","relax","gentle","soft","tranquil","rest","easy","breath"] },
    { emotion: "grateful",    words: ["grateful","thankful","gratitude","blessed","appreciate","fortune","lucky","gift"] },
    { emotion: "energized",   words: ["energy","alive","vibrant","strong","power","refresh","invigorate","awake","active","hike","run","climb"] },
    { emotion: "reflective",  words: ["think","reflect","wonder","ponder","realize","understand","notice","observe","contemplate","question"] },
    { emotion: "melancholic", words: ["sad","miss","lonely","alone","lost","heavy","grey","gray","blue","sorrow","ache","yearn"] },
    { emotion: "anxious",     words: ["anxious","worry","stress","fear","nervous","overwhelm","tense","pressure","uneasy","dread"] },
    { emotion: "peaceful",    words: ["peaceful","harmony","balance","flow","clear","open","free","light","float","pure","nature","bird"] },
    { emotion: "hopeful",     words: ["hope","future","new","begin","start","growth","seed","dawn","rise","better","possibility"] },
    { emotion: "overwhelmed", words: ["overwhelm","too much","exhausted","tired","heavy","burden","weight","chaos","noise","difficult"] },
  ];

  const scores = {};
  for (const { emotion, words } of emotionMap) {
    scores[emotion] = words.filter(w => t.includes(w)).length;
  }
  const topEmotion = Object.entries(scores).sort((a,b) => b[1]-a[1])[0][0];

  // Extract keywords: meaningful words > 4 chars, not stopwords
  const stopwords = new Set(["that","this","with","have","from","they","were","been","their","there","when","what","which","about","into","through","during","before","after","above","below","between","each","both","few","more","most","other","some","such","than","then","these","those","while","would","could","should","shall","will","just","because","being","doing","having","make","made","take","come","came","went","said","told","knew","upon","also","like","very","quite","really","feel","felt","felt"]);
  const words = t.match(/\b[a-z]{4,}\b/g) || [];
  const keywords = [...new Set(words.filter(w => !stopwords.has(w)))].slice(0, 5);

  const summaryMap = {
    calm: "The user experienced a sense of calm and peace during their nature session.",
    joyful: "The user felt joyful and uplifted during their time in nature.",
    grateful: "The user felt deeply grateful and appreciative during their session.",
    energized: "The user felt energized and invigorated by their nature experience.",
    reflective: "The user engaged in deep reflection during their time in nature.",
    melancholic: "The user experienced a gentle melancholy during their nature session.",
    anxious: "The user noticed feelings of anxiety while spending time in nature.",
    peaceful: "The user felt a profound sense of peace during their nature session.",
    hopeful: "The user felt hopeful and renewed after their time in nature.",
    overwhelmed: "The user felt overwhelmed but sought solace in nature.",
  };

  return {
    emotion: topEmotion,
    keywords: keywords.length >= 3 ? keywords : ["nature", "reflection", "presence"],
    summary: summaryMap[topEmotion],
    cached: false,
    source: "local",
  };
}

// ── Call OpenRouter with a single model ───────────────────────────────────────
async function callOpenRouter(model, text, apiKey) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "http://localhost:5173",
      "X-Title": "ArvyaX Journal",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: `You are an emotional intelligence analyst for a nature wellness journal. Respond with ONLY a raw JSON object, no markdown, no extra text. Format: {"emotion":"single_word_lowercase","keywords":["word1","word2","word3"],"summary":"One sentence about emotional state."}`
        },
        {
          role: "user",
          content: `Analyze this journal entry: "${text}". Return JSON only.`
        }
      ],
      temperature: 0.2,
      max_tokens: 200,
    }),
  });

  const responseText = await response.text();
  if (response.status === 401) throw new Error("401_INVALID_KEY");
  if (response.status === 404 || response.status === 503) throw new Error("404_NOT_FOUND");
  if (response.status === 429) throw new Error("429_RATE_LIMITED");
  if (!response.ok) throw new Error(`HTTP_${response.status}`);

  let data;
  try { data = JSON.parse(responseText); }
  catch (e) { throw new Error("Non-JSON response"); }

  const raw = data?.choices?.[0]?.message?.content;
  if (!raw) throw new Error("Empty content");
  return parseResult(raw);
}

// ── Main export ───────────────────────────────────────────────────────────────
async function analyzeEmotion(text) {
  const cached = getCachedAnalysis(text);
  if (cached) { console.log("📦 Cache hit"); return cached; }

  const apiKey = getApiKey();
  if (!apiKey) {
    console.log("⚠️  No API key — using local analyzer");
    return localAnalyze(text);
  }

  // openrouter/free is the official free router that picks any available free model
  const models = [
    "openrouter/free",
    "nousresearch/hermes-3-llama-3.1-405b:free",
    "meta-llama/llama-3.2-11b-vision-instruct:free",
    "liquid/lfm-40b:free",
    "huggingfaceh4/zephyr-7b-beta:free",
  ];

  for (const model of models) {
    console.log(`🔍 Trying: ${model}`);
    try {
      const result = await callOpenRouter(model, text, apiKey);
      cacheAnalysis(text, result);
      console.log(`✅ Success — emotion: ${result.emotion}`);
      return { ...result, cached: false };
    } catch (err) {
      if (err.message === "401_INVALID_KEY") {
        console.log("❌ Invalid key — falling back to local analyzer");
        break; // stop trying, go to local fallback
      }
      console.log(`⚠️  ${model}: ${err.message}, trying next...`);
      continue;
    }
  }

  // Always succeed with local fallback — never show error to user
  console.log("🔄 All API models failed — using local rule-based analyzer");
  const result = localAnalyze(text);
  cacheAnalysis(text, result);
  return result;
}

async function analyzeEmotionStream(text, res) {
  const cached = getCachedAnalysis(text);
  if (cached) {
    res.write(`data: ${JSON.stringify({ type: "cached", data: cached })}\n\n`);
    res.end();
    return;
  }
  const result = await analyzeEmotion(text); // never throws now
  res.write(`data: ${JSON.stringify({ type: "complete", data: result })}\n\n`);
  res.end();
}

module.exports = { analyzeEmotion, analyzeEmotionStream };
