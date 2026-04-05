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
    
    throw new Error(`Could not parse JSON from: ${cleaned.substring(0, 200)}`);
  }
}

export const classifyIssue = async (intent, description) => {
  const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.REOPEN_AI_API_KEY;
  console.log("[classificationAI] Classifying issue. API Key exists:", !!GEMINI_API_KEY);

  const prompt = `You are an intelligent civic issue classification system for Indian municipal complaints.

Given a citizen's issue, classify it into:
1. category (broad classification)
2. department (responsible authority)

Choose the MOST APPROPRIATE from:

Categories:
* Roads & Infrastructure
* Sanitation & Cleanliness
* Water Supply & Sewer
* Electricity & Streetlights
* Encroachment & Illegal Activity
* Animal Welfare
* Public Facilities
* Construction & Safety
* Taxes & Documentation
* Other Civic Issues

Guidelines:
* Be practical and realistic for Indian municipal systems
* Map issues like:
  potholes → Roads
  garbage → Sanitation
  dogs → Animal Welfare
  illegal shops → Encroachment
* Department should sound realistic (e.g., PWD, Municipal Sanitation Dept, Jal Board, Animal Control, etc.)

Citizen Intent: "${intent}"
Description: "${description}"

Return ONLY JSON:
{
"category": "...",
"department": "...",
"confidence": "high/medium/low"
}`;

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
    console.log("[classificationAI] Raw Gemini response:", rawText);
    
    const result = extractJSON(rawText);
    console.log("[classificationAI] Parsed classification result:", result);
    return result;
  } catch (err) {
    console.error("[classificationAI] Classification ERROR:", err.response?.data || err.message);
    // Fallback: allow through so user isn't stuck
    return {
      category: "Other Civic Issues",
      department: "Municipal Corporation",
      confidence: "low"
    };
  }
};
