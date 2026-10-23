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

const CHAT_MODELS = ['gemini-3.5-flash-lite', 'gemini-2.5-flash', 'gemini-3.8-flash'];
const VISION_MODELS = ['gemini-2.5-flash', 'gemini-3.8-flash', 'gemini-3.5-flash-lite'];

async function callGeminiWithFallback(models, payload, timeoutMs = 25000) {
  let rawKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!rawKey) {
    throw new Error("Server configuration error: Gemini API key missing.");
  }
  const key = rawKey.replace(/["']/g, '').trim();

  let lastError = null;
  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const response = await axios.post(url, payload, { timeout: timeoutMs });
      if (response.data) {
        return response.data;
      }
    } catch (err) {
      console.warn(`[aiRoutes] Model ${model} failed:`, err.response?.data?.error?.message || err.message);
      lastError = err;
    }
  }
  throw lastError || new Error("All AI models failed to respond");
}

router.use(basicRateLimit);

// POST /api/ai/chat
router.post('/chat', async (req, res) => {
  try {
    const { contents, generationConfig } = req.body;
    const data = await callGeminiWithFallback(
      CHAT_MODELS,
      {
        contents,
        generationConfig: generationConfig || { maxOutputTokens: 400, temperature: 0.7 }
      },
      15000
    );
    res.json(data);
  } catch (err) {
    console.error("[aiRoutes/chat] Error:", err.response?.data || err.message);
    res.status(err.response?.status || 500).json(err.response?.data || { error: { message: "An error occurred with the AI service." } });
  }
});

// POST /api/ai/vision
router.post('/vision', async (req, res) => {
  try {
    const { contents, generationConfig } = req.body;
    const data = await callGeminiWithFallback(
      VISION_MODELS,
      {
        contents,
        generationConfig: generationConfig || {
          maxOutputTokens: 1000,
          temperature: 0.1,
          responseMimeType: 'application/json'
        }
      },
      30000
    );
    res.json(data);
  } catch (err) {
    console.error("[aiRoutes/vision] Error:", err.response?.data || err.message);
    res.status(err.response?.status || 500).json(err.response?.data || { error: { message: "An error occurred with the AI service." } });
  }
});

export default router;
