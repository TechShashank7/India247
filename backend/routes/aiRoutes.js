import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// SECURITY NOTE: This route proxies requests to Gemini AI.
// The API key is read exclusively on the server and is never exposed to the frontend.
// The basicRateLimit middleware prevents abuse by limiting API calls per IP.

// Basic in-memory rate limiting to prevent abuse
const rateLimitMap = new Map();
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 100;

setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, WINDOW_MS);

function basicRateLimit(req, res, next) {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const now = Date.now();
  
  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    return next();
  }
  
  const record = rateLimitMap.get(ip);
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + WINDOW_MS;
    return next();
  }
  
  if (record.count >= MAX_REQUESTS) {
    return res.status(429).json({ error: { message: "Too many requests from this IP, please try again later." } });
  }
  
  record.count++;
  next();
}

router.use(basicRateLimit);

// POST /api/ai/chat
router.post('/chat', async (req, res) => {
  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: { message: "Server configuration error: Gemini API key missing." } });
    }

    const { contents, generationConfig } = req.body;
    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`;

    const response = await axios.post(GEMINI_URL, {
      contents,
      generationConfig: generationConfig || { maxOutputTokens: 400, temperature: 0.7 }
    }, {
      timeout: 15000 // 15 seconds timeout
    });

    res.json(response.data);
  } catch (err) {
    console.error("[aiRoutes/chat] Error:", err.response?.data || err.message);
    res.status(err.response?.status || 500).json(err.response?.data || { error: { message: "An error occurred with the AI service." } });
  }
});

// POST /api/ai/vision
router.post('/vision', async (req, res) => {
  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: { message: "Server configuration error: Gemini API key missing." } });
    }

    const { contents, generationConfig } = req.body;
    const GEMINI_VISION_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const response = await axios.post(GEMINI_VISION_URL, {
      contents,
      generationConfig: generationConfig || { maxOutputTokens: 1000, temperature: 0.1 }
    }, {
      timeout: 20000 // 20 seconds timeout for vision
    });

    res.json(response.data);
  } catch (err) {
    console.error("[aiRoutes/vision] Error:", err.response?.data || err.message);
    res.status(err.response?.status || 500).json(err.response?.data || { error: { message: "An error occurred with the AI service." } });
  }
});

export default router;
