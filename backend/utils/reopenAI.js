import fs from 'fs';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Robust JSON extractor - handles markdown fencing, truncated responses, etc.
function extractJSON(text) {
  // Remove markdown code fences
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  
  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Try to find a complete JSON object in the text
    const jsonMatch = cleaned.match(/\{[^}]+\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e2) {
        // nothing
      }
    }
    
    // Last resort: try to infer from partial response
    const hasValid = cleaned.includes('"valid"');
    if (hasValid) {
      const isTrue = cleaned.includes('"valid": true') || cleaned.includes('"valid":true');
      return { valid: isTrue, message: isTrue ? "Request appears valid" : "Request appears invalid" };
    }
    
    throw new Error(`Could not parse JSON from: ${cleaned.substring(0, 200)}`);
  }
}

export const validateReopenReason = async (originalDescription, reason) => {
  const GEMINI_API_KEY = process.env.REOPEN_AI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  console.log("[reopenAI] Validating reason. API Key exists:", !!GEMINI_API_KEY);

  const prompt = `You are an AI validator for a civic complaint platform. A user previously filed this complaint: "${originalDescription}". Now they want to REOPEN it with this reason: "${reason}". Is the reopen VALID? VALID if reason relates to original, issue unresolved, safety concern, or inadequate work. INVALID if unrelated, different issue, spam, or vague. Respond with ONLY raw JSON, nothing else: {"valid": true, "message": "short reason"} or {"valid": false, "message": "short reason"}`;

  try {
    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const res = await axios.post(GEMINI_URL, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { 
        maxOutputTokens: 1024, 
        temperature: 0.0,
        responseMimeType: "application/json"
      },
    });

    const data = res.data;
    const rawText = data.candidates[0].content.parts[0].text.trim();
    console.log("[reopenAI] Raw Gemini response:", rawText);
    
    const result = extractJSON(rawText);
    console.log("[reopenAI] Parsed result:", result);
    return result;
  } catch (err) {
    console.error("[reopenAI] Reason Validation ERROR:", err.response?.data || err.message);
    // Fallback: allow through so user isn't stuck
    return { valid: true, message: "AI validation unavailable - request allowed as fallback" };
  }
};

export const validateReopenImage = async (originalDescription, reason, imagePath) => {
  if (!imagePath) return { valid: true };

  const GEMINI_API_KEY = process.env.REOPEN_AI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  console.log("[reopenAI] Validating image. API Key exists:", !!GEMINI_API_KEY);

  const prompt = `You are an AI image verifier for a civic complaint platform. Original complaint: "${originalDescription}". Reopen reason: "${reason}". Check: does the image match the original complaint and support the reopen reason? Reject if completely unrelated. Respond with ONLY raw JSON: {"valid": true, "message": "short reason"} or {"valid": false, "message": "short reason"}`;

  try {
    const GEMINI_VISION_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    let fileData;
    if (imagePath.startsWith('http')) {
      const response = await axios.get(imagePath, { responseType: 'arraybuffer' });
      fileData = Buffer.from(response.data, 'binary');
    } else {
      fileData = fs.readFileSync(imagePath);
    }
    const base64Image = fileData.toString('base64');
    
    const ext = imagePath.split('.').pop().split('?')[0].toLowerCase();
    let mimeType = 'image/jpeg';
    if (ext === 'png') mimeType = 'image/png';
    if (ext === 'webp') mimeType = 'image/webp';

    const res = await axios.post(GEMINI_VISION_URL, {
      contents: [{
        parts: [
          { inline_data: { mime_type: mimeType, data: base64Image } },
          { text: prompt },
        ],
      }],
      generationConfig: { 
        maxOutputTokens: 1024, 
        temperature: 0.0,
        responseMimeType: "application/json"
      },
    });

    const data = res.data;
    const rawText = data.candidates[0].content.parts[0].text.trim();
    console.log("[reopenAI] Raw Vision response:", rawText);
    
    const result = extractJSON(rawText);
    console.log("[reopenAI] Image validation result:", result);
    return result;
  } catch (err) {
    console.error("[reopenAI] Image Validation ERROR:", err.response?.data || err.message);
    return { valid: true, message: "Vision validation unavailable - allowed as fallback" };
  }
};
