import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check both root and local .env
if (fs.existsSync(path.join(__dirname, '../../.env'))) {
  dotenv.config({ path: path.join(__dirname, '../../.env') });
} else if (fs.existsSync(path.join(__dirname, '../.env'))) {
  dotenv.config({ path: path.join(__dirname, '../.env') });
} else {
  dotenv.config();
}

// Robust JSON extractor - handles markdown fencing, truncated responses, etc.
function extractJSON(text) {
  if (!text) throw new Error("Empty text provided to extractJSON");
  // Remove markdown code fences
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  
  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Try to find a complete JSON object in the text
    const jsonMatch = cleaned.match(/\{[\s\S]*?\}/);
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

// Intelligent rule-based civic classifier for Indian municipal categories
export function classifyByKeywords(intent = '', description = '') {
  const combined = `${intent || ''} ${description || ''}`.toLowerCase();

  if (/street\s*light|streetlight|lamp\s*post|lamppost|electric\s*pole|electricity|power\s*line|exposed\s*wire|sparking|transformer|blackout|voltage|current\s*shock|short\s*circuit|meter\s*box|fuse|bijli/i.test(combined)) {
    return {
      category: "Electricity & Streetlights",
      department: "Municipal Corporation of Delhi (MCD)",
      confidence: "medium"
    };
  }

  if (/pothole|road|pavement|footpath|divider|speed\s*breaker|bridge|flyover|underpass|asphalt|tar|sinkhole|cave-in|sadak/i.test(combined)) {
    return {
      category: "Roads & Infrastructure",
      department: "Public Works Department (PWD)",
      confidence: "medium"
    };
  }

  if (/water\s*pipe|pipe\s*burst|water\s*leak|no\s*water|dirty\s*water|water\s*supply|sewer|sewage|drain|drainage|overflowing\s*drain|gutter|manhole|nalah|paani|jal/i.test(combined)) {
    return {
      category: "Water Supply & Sewer",
      department: "Delhi Jal Board (DJB)",
      confidence: "medium"
    };
  }

  if (/garbage|trash|waste|dump|kachra|dustbin|overflowing\s*bin|uncollected|sweeping|filth|stench|foul\s*smell|debris|malba|cleanliness/i.test(combined)) {
    return {
      category: "Sanitation & Cleanliness",
      department: "Municipal Corporation of Delhi (MCD)",
      confidence: "medium"
    };
  }

  if (/stray\s*dog|street\s*dog|dog\s*bite|rabies|aggressive\s*dog|barking\s*dog|cattle|cow|bull|monkey|animal\s*menace|animal\s*rescue|dead\s*animal/i.test(combined)) {
    return {
      category: "Animal Welfare",
      department: "Municipal Corporation of Delhi (MCD)",
      confidence: "medium"
    };
  }

  if (/encroach|illegal\s*shop|hawker|squatter|illegal\s*construction|footpath\s*block|road\s*block|unauthorized\s*parking|kabza/i.test(combined)) {
    return {
      category: "Encroachment & Illegal Activity",
      department: "Municipal Corporation of Delhi (MCD)",
      confidence: "medium"
    };
  }

  if (/park|garden|playground|swing|public\s*toilet|community\s*hall|bus\s*shelter|bus\s*stop|bench/i.test(combined)) {
    return {
      category: "Public Facilities",
      department: "Municipal Corporation of Delhi (MCD)",
      confidence: "medium"
    };
  }

  if (/building\s*collapse|unsafe\s*wall|scaffolding|demolition|falling\s*plaster|open\s*pit|construction\s*hazard/i.test(combined)) {
    return {
      category: "Construction & Safety",
      department: "Public Works Department (PWD)",
      confidence: "medium"
    };
  }

  return {
    category: "Other Civic Issues",
    department: "Municipal Corporation of Delhi (MCD)",
    confidence: "low"
  };
}

export const classifyIssue = async (intent = '', description = '') => {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.REOPEN_AI_API_KEY;
  console.log("[classificationAI] Classifying issue. API Key exists:", !!GEMINI_API_KEY);

  const prompt = `You are an intelligent civic issue classification system for Indian municipal complaints.

Given a citizen's issue, classify it into:
1. category (broad classification)
2. department (responsible authority)

Choose the MOST APPROPRIATE category from this exact list:
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
* Be practical and realistic for Indian municipal systems (e.g. MCD, PWD, DJB)
* Accurate Mapping:
  - streetlights, fallen poles, broken lamps, power lines, transformers -> category: "Electricity & Streetlights", department: "Municipal Corporation of Delhi (MCD)"
  - potholes, broken roads, damaged pavements, footpaths -> category: "Roads & Infrastructure", department: "Public Works Department (PWD)"
  - garbage heaps, overflowing bins, uncollected trash, cleaning -> category: "Sanitation & Cleanliness", department: "Municipal Corporation of Delhi (MCD)"
  - pipe leaks, sewage overflow, contaminated water, dirty supply -> category: "Water Supply & Sewer", department: "Delhi Jal Board (DJB)"
  - stray dogs, aggressive animals, cattle, monkey menace -> category: "Animal Welfare", department: "Municipal Corporation of Delhi (MCD)"
  - illegal stalls, footpath encroachment, unauthorized shops -> category: "Encroachment & Illegal Activity", department: "Municipal Corporation of Delhi (MCD)"
  - park maintenance, public toilets, community halls -> category: "Public Facilities", department: "Municipal Corporation of Delhi (MCD)"
* IMPORTANT: NEVER categorize streetlights, potholes, garbage, water leaks, or animal issues as "Other Civic Issues"! Only use "Other Civic Issues" if the issue genuinely does not match any category above.

Citizen Intent: "${intent}"
Description: "${description}"

Return ONLY JSON:
{
"category": "...",
"department": "...",
"confidence": "high"
}`;

  if (GEMINI_API_KEY) {
    const modelsToTry = [
      'gemini-3.8-flash',
      'gemini-2.5-flash',
      'gemini-3.5-flash-lite'
    ];

    for (const model of modelsToTry) {
      try {
        const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

        const res = await axios.post(GEMINI_URL, {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { 
            maxOutputTokens: 1024, 
            temperature: 0.0,
            responseMimeType: "application/json"
          },
        }, { timeout: 10000 });

        const data = res.data;
        const parts = data.candidates?.[0]?.content?.parts || [];
        const textPart = parts.find(p => p.text && !p.thought) || parts.find(p => p.text) || parts[0];
        const rawText = textPart?.text ? textPart.text.trim() : '';
        console.log(`[classificationAI] Model ${model} response:`, rawText);
        
        const result = extractJSON(rawText);
        console.log("[classificationAI] Parsed classification result:", result);

        // If Gemini returned "Other Civic Issues" but keywords clearly indicate a specific category, correct it
        if (result.category === "Other Civic Issues") {
          const heuristic = classifyByKeywords(intent, description);
          if (heuristic.category !== "Other Civic Issues") {
            return heuristic;
          }
        }

        return result;
      } catch (err) {
        console.warn(`[classificationAI] Model ${model} error:`, err.response?.data?.error?.message || err.message);
      }
    }
  }

  // Fallback to intelligent heuristic classifier
  console.log("[classificationAI] Falling back to heuristic classifier");
  return classifyByKeywords(intent, description);
};
