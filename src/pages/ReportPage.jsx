import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Send, MapPin, Loader } from 'lucide-react';
import axios from 'axios';
import ChatBubble from '../components/ChatBubble';
import { useAuth } from '../context/AuthContext';

// ─── API KEYS ────────────────────────────────────────────────────────────────
// SECURITY NOTE: The Gemini API key is now securely kept on the server-side.
// The frontend only communicates with the backend proxy /api/ai endpoints.
// Google Maps API Key is public by design, so it can be safely exposed.
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.DEV ? 'http://localhost:5000' : 'https://api.india247.shashankraj.in';
const AI_CHAT_URL = `${API_BASE}/api/ai/chat`;
const AI_VISION_URL = `${API_BASE}/api/ai/vision`;

// ─── Fix PlaceAutocompleteElement styling ─────────────────────────────────────
const styleEl = document.createElement('style');
styleEl.textContent = `
  .gmp-wrapper {
    position: relative;
    width: 100%;
    border: 1.5px solid #e5e7eb;
    border-radius: 12px;
    background: white;
    height: 44px;
    color-scheme: light;
  }
  .gmp-wrapper:focus-within {
    border-color: #FF6B35;
    box-shadow: 0 0 0 3px rgba(255,107,53,0.15);
  }
  .gmp-wrapper gmp-place-autocomplete {
    width: 100%;
    height: 44px;
    display: block;
  }
  .gmp-wrapper gmp-place-autocomplete::part(input) {
    background: white !important;
    color: #111827 !important;
    border: none !important;
    outline: none !important;
    padding: 0 14px !important;
    height: 44px !important;
    font-size: 14px !important;
    width: 100% !important;
    box-sizing: border-box !important;
    font-family: inherit !important;
  }
`;
if (!document.getElementById('gmp-style')) {
  styleEl.id = 'gmp-style';
  document.head.appendChild(styleEl);
}

// ─── Out-of-scope redirect map ────────────────────────────────────────────────
// Used by the AI system prompt to know what to reference, not hardcoded in UI
const OUT_OF_SCOPE_EXAMPLES = `
- Cybercrime / online fraud → cyberdost.gov.in or call 1930
- Medical emergency → call 108
- Police / crime → call 100 or visit nearest police station  
- Consumer complaints → consumerhelpline.gov.in or call 1800-11-4000
- Income tax / financial fraud → incometaxindiaefiling.gov.in
- Railway complaints → railmadad.indianrailways.gov.in or call 139
`;

// ─── AI System Prompt ─────────────────────────────────────────────────────────
const MEERA_SYSTEM_PROMPT = `You are Meera, the AI assistant for India247 — a civic complaint platform for Indian citizens.

Your job is to help citizens report CIVIC issues only. Civic issues include:
- Roads: potholes, broken pavements, road damage, encroachment
- Garbage & Sanitation: uncollected garbage, overflowing bins, illegal dumping
- Water & Sewage: pipe leaks, sewer overflow, water supply issues, open drains
- Electricity & Streetlights: broken streetlights, power line hazards, transformer issues
- Parks & Public Spaces: broken equipment, encroachment, neglected maintenance
- Public Infrastructure: broken footpaths, damaged public property, open manholes, stray animal menace

CONVERSATION FLOW:
1. The first greeting has already been sent. Do NOT greet or re-introduce yourself again.
2. ABSOLUTELY NEVER ASK FOR LOCATION, LANDMARK, STREET, OR AREA:
   - Do NOT ask "Where is this located?", "Which area?", or "What landmark is nearby?".
   - The citizen will pin their exact GPS location on an interactive Google Map in Step 4. Asking for location in chat is strictly forbidden and redundant.
3. NEVER ASK OBVIOUS OR SENSELESS QUESTIONS:
   - Do NOT ask questions whose answers are obvious (e.g. if a streetlight is broken, do NOT ask if it gets dark at night; if a pipe bursts, do NOT ask if water is leaking).
   - Do NOT interrogate the citizen.
4. MAXIMUM 1 QUICK FOLLOW-UP QUESTION (KEEP IT FAST & MINIMAL):
   - You may ask AT MOST ONE simple, relevant question only if essential information is missing (e.g., "About how long has this been happening?").
   - If the user's initial message already provided enough context (e.g., they already mentioned how long or described the issue clearly), DO NOT ask any questions! Immediately wrap up and request a photo.
5. READY FOR PHOTO (WRAP UP PROMPTLY):
   - As soon as the user replies to your question (or immediately if their first message had enough detail), you MUST conclude with a brief statement asking for a photo of the issue.
   - The final message must be a statement, NOT a question.
   - You MUST end the message with [READY_FOR_PHOTO].
   - Example: "Thank you for the details. Please upload a photo of the issue so I can proceed with filing your complaint. [READY_FOR_PHOTO]"
6. Never mention "[READY_FOR_PHOTO]" explicitly to the user in conversation — it's a hidden signal.

INTENT DETECTION:
Once you understand the user's issue clearly, include this hidden line in ONE of your responses:

[INTENT: "short natural description of the issue"]

Examples:
- [INTENT: "pothole causing accidents on main road"]
- [INTENT: "garbage not collected for several days"]
- [INTENT: "street light not working at night"]
- [INTENT: "stray dogs attacking people"]

Rules:
- Keep it short (5–10 words)
- Do NOT include category or department
- Do NOT explain anything
- Output ONLY the intent in plain English
- Include it only once when confident

OUT-OF-SCOPE ISSUES:
If the user describes something that is NOT a civic issue (cybercrime, medical, personal disputes, financial fraud, etc.), politely explain that India247 is only for civic/municipal issues. Direct them to the appropriate authority:
${OUT_OF_SCOPE_EXAMPLES}
Then end with: [OUT_OF_SCOPE] on its own line.

TONE: Warm, simple, friendly. Use 1 emoji per message max. Keep responses SHORT — 1-3 sentences. Remember many users may not be very tech-savvy. Do not use jargon.

LANGUAGE STRICT ENFORCEMENT (CRITICAL):
- You MUST ALWAYS match the citizen's language:
  * When the citizen speaks in English -> You MUST respond in pure, natural English only! NEVER use Hindi or Hinglish words (like "kitne dinon se", "kya", "sadak", etc.) when the citizen is speaking English!
  * When the citizen speaks in Hindi (Devanagari script) -> Respond in Hindi (Devanagari script).
  * When the citizen speaks in Hinglish (Roman script Hindi) -> Respond in Hinglish.
- If the citizen speaks English, English is MANDATORY. Do NOT mix languages.
- ABSOLUTELY NEVER prefix your reply with language tags (e.g. NEVER output "[USER LANGUAGE: ...]" or "[Hinglish]"). Output only your direct dialogue to the citizen.`;

// ─── Retry helper ────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchWithRetry(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, options);
    if (res.status === 429) {
      await sleep([15000, 30000, 60000][i]);
      continue;
    }
    return res;
  }
  throw new Error('Too many requests — please wait a moment and try again.');
}

// ─── Detect User Language ───────────────────────────────────────────────────
function detectUserLanguage(text) {
  if (!text) return 'English';
  if (/[\u0900-\u097F]/.test(text)) return 'Hindi';

  const hinglishWords = new Set([
    'hai', 'hain', 'ho', 'hona', 'hoga', 'hogi', 'hoge',
    'raha', 'rahi', 'rahe', 'tha', 'thi', 'the',
    'kya', 'kyun', 'kaise', 'kab', 'kahan', 'kidhar',
    'nahi', 'nhi', 'mat', 'bhi', 'aur', 'lekin', 'par', 'pe', 'se', 'ko', 'ka', 'ki', 'ke',
    'yeh', 'ye', 'woh', 'wo', 'mera', 'meri', 'mere', 'tera', 'teri', 'tere', 'apna', 'apni', 'apne',
    'karo', 'karna', 'kar', 'diya', 'liya', 'de', 'do', 'aaya', 'aayi', 'gaya', 'gayi',
    'bohot', 'bahut', 'thoda', 'jyada', 'zyada', 'sirf', 'paani', 'sadak', 'kachra', 'bijli', 'dinon'
  ]);

  const words = text.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
  const matchCount = words.filter(w => hinglishWords.has(w)).length;
  if (matchCount >= 2 || (words.length > 0 && matchCount / words.length >= 0.25)) {
    return 'Hinglish';
  }
  return 'English';
}

// ─── Gemini text helper ───────────────────────────────────────────────────────
async function callGemini({ messages }) {
  const systemMsg = messages.find(m => m.role === 'system');
  const chatMsgs = messages.filter(m => m.role !== 'system');

  // Detect language of the latest user message
  const userMessages = chatMsgs.filter(m => m.role === 'user');
  const userMsgCount = userMessages.length;
  const lastUserMsg = userMessages[userMessages.length - 1]?.content || '';
  const detectedLang = detectUserLanguage(lastUserMsg);

  let langDirective = 'CRITICAL INSTRUCTION: The citizen speaks English. You MUST respond in natural, pure English only without any Hindi or Hinglish words. Do NOT include any meta tags or language labels.';
  if (detectedLang === 'Hindi') {
    langDirective = 'CRITICAL INSTRUCTION: The citizen speaks Hindi. Respond in Hindi (Devanagari script) only. Do NOT include any meta tags or language labels.';
  } else if (detectedLang === 'Hinglish') {
    langDirective = 'CRITICAL INSTRUCTION: The citizen speaks Hinglish. Respond in warm, natural conversational Hinglish (Roman script Hindi) only. Do NOT include any meta tags, language labels, or bracketed prefixes.';
  }

  let turnDirective = '';
  if (userMsgCount >= 2) {
    turnDirective = '\nCRITICAL: User turn 2 reached. You have gathered enough information. Wrap up NOW with a short statement requesting a photo and end with [READY_FOR_PHOTO]. Absolutely DO NOT ask any more questions.';
  } else if (userMsgCount === 1) {
    turnDirective = '\nGUIDELINE: If the user\'s message already provides enough context, do NOT ask any questions. Wrap up and request a photo with [READY_FOR_PHOTO]. Otherwise, ask at most ONE quick question about how long it has been happening. Do NOT ask about landmarks or location.';
  }

  const historyText = chatMsgs
    .map(m => `${m.role === 'user' ? 'User' : 'Meera'}: ${m.content}`)
    .join('\n');

  const fullPrompt = `${systemMsg ? systemMsg.content : MEERA_SYSTEM_PROMPT}\n\n${langDirective}${turnDirective}\n\n--- CONVERSATION ---\n${historyText}\nMeera:`;

  const res = await fetchWithRetry(AI_CHAT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: fullPrompt }] }],
      generationConfig: { maxOutputTokens: 400, temperature: 0.7 },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Gemini API error');
  return data.candidates[0].content.parts[0].text.trim();
}

// ─── Client-side image resizer & compressor ──────────────────────────────────
async function compressAndResizeImage(file, maxWidth = 1024, maxHeight = 1024, quality = 0.8) {
  try {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  } catch (err) {
    console.warn("Canvas compression failed, falling back to raw data URL", err);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

// ─── Gemini vision helper ─────────────────────────────────────────────────────
async function callGeminiVision({ prompt, base64Image, mediaType }) {
  const res = await fetchWithRetry(AI_VISION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inline_data: { mime_type: mediaType, data: base64Image } },
          { text: prompt },
        ],
      }],
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.1,
        responseMimeType: 'application/json'
      },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Gemini Vision error');
  return data.candidates[0].content.parts[0].text.trim();
}

// ─── Parse hidden markers from AI response ────────────────────────────────────
function parseAIResponse(rawText) {
  let cleanText = rawText || '';
  let readyForPhoto = false;
  let outOfScope = false;
  let intent = null;

  // Check for [READY_FOR_PHOTO]
  if (/\[READY_FOR_PHOTO\]/i.test(cleanText)) {
    readyForPhoto = true;
    cleanText = cleanText.replace(/\[READY_FOR_PHOTO\]/gi, '').trim();
  }

  // Check for [OUT_OF_SCOPE]
  if (/\[OUT_OF_SCOPE\]/i.test(cleanText)) {
    outOfScope = true;
    cleanText = cleanText.replace(/\[OUT_OF_SCOPE\]/gi, '').trim();
  }

  // Check for [INTENT: "..."]
  const intentMatch = cleanText.match(/\[INTENT:\s*"([^"]+)"\]/i);
  if (intentMatch) {
    intent = intentMatch[1].trim();
    cleanText = cleanText.replace(intentMatch[0], '').trim();
  }

  // Strip any accidental [USER LANGUAGE: ...], [LANGUAGE: ...], or similar bracket tags
  cleanText = cleanText.replace(/\[USER\s*LANGUAGE:[^\]]*\]/gi, '').trim();
  cleanText = cleanText.replace(/\[LANGUAGE:[^\]]*\]/gi, '').trim();
  cleanText = cleanText.replace(/\[SYSTEM:[^\]]*\]/gi, '').trim();
  cleanText = cleanText.replace(/^\[(USER\s*LANGUAGE|LANGUAGE|SYSTEM|INSTRUCTION|NOTE|HINGLISH|HINDI|ENGLISH)[^\]]*\]:?\s*/i, '').trim();

  // Clean up any leftover double newlines
  cleanText = cleanText.replace(/\n{3,}/g, '\n\n').trim();

  return { cleanText, readyForPhoto, outOfScope, intent };
}

// ─── Load Google Maps ─────────────────────────────────────────────────────────
function loadGoogleMaps() {
  return new Promise((resolve, reject) => {
    if (window.google?.maps?.places?.PlaceAutocompleteElement) return resolve();
    if (document.getElementById('gmap-script')) {
      const interval = setInterval(() => {
        if (window.google?.maps) { clearInterval(interval); resolve(); }
      }, 100);
      return;
    }
    window.__googleMapsCallback = resolve;
    const script = document.createElement('script');
    script.id = 'gmap-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=maps,places,marker&v=weekly&callback=__googleMapsCallback`;
    script.async = true;
    script.defer = true;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// ─── Region Helper ────────────────────────────────────────────────────────────
function deriveRegionFromLocation(locationString) {
  if (!locationString) return 'Central Delhi';
  const loc = locationString.toLowerCase();
  if (loc.includes('north east') || loc.includes('northeast')) return 'North East Delhi';
  if (loc.includes('north west') || loc.includes('northwest')) return 'North West Delhi';
  if (loc.includes('south east') || loc.includes('southeast')) return 'South East Delhi';
  if (loc.includes('south west') || loc.includes('southwest')) return 'South West Delhi';
  if (loc.includes('shahdara')) return 'Shahdara';
  if (loc.includes('north') || loc.includes('rohini')) return 'North Delhi';
  if (loc.includes('south') || loc.includes('lajpat') || loc.includes('saket')) return 'South Delhi';
  if (loc.includes('east') || loc.includes('mayur vihar')) return 'East Delhi';
  if (loc.includes('west') || loc.includes('punjabi bagh')) return 'West Delhi';
  if (loc.includes('new delhi') || loc.includes('connaught')) return 'New Delhi';
  return 'Central Delhi';
}

// ─── Heuristic Classifier & Intent Helpers ─────────────────────────────────────
function extractFallbackIntent(conversation, defaultVal = 'Civic Issue') {
  const firstUserMsg = conversation.find(m => m.role === 'user')?.content;
  if (!firstUserMsg) return defaultVal;
  if (firstUserMsg.length <= 60) return firstUserMsg.trim();
  const firstSentence = firstUserMsg.split(/[.?!,\n]/)[0].trim();
  return firstSentence.length > 5 ? firstSentence : firstUserMsg.substring(0, 50).trim();
}

function classifyHeuristic(intent = '', description = '') {
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


// ─── Location Picker ──────────────────────────────────────────────────────────
const LocationPicker = ({ onLocationConfirmed }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const autocompleteContainerRef = useRef(null);
  const addressRef = useRef('');
  const latRef = useRef(null);
  const lngRef = useRef(null);

  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);

  const DEFAULT_CENTER = { lat: 28.6139, lng: 77.2090 };

  const reverseGeocode = React.useCallback(async (lat, lng) => {
    const { Geocoder } = await window.google.maps.importLibrary('geocoding');
    const geocoder = new Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results[0]) {
        addressRef.current = results[0].formatted_address;
        setAddress(results[0].formatted_address);
      }
    });
  }, []);

  const placeMarkerAdv = React.useCallback((position, AdvancedMarkerElement) => {
    if (markerRef.current) markerRef.current.map = null;
    const pin = document.createElement('div');
    pin.style.cssText = `
      width: 20px; height: 20px;
      background: #FF6B35;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    `;
    markerRef.current = new AdvancedMarkerElement({
      position,
      map: mapInstanceRef.current,
      content: pin,
    });
    mapInstanceRef.current.panTo(position);
  }, []);

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) return alert('Geolocation not supported.');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const position = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        latRef.current = position.lat;
        lngRef.current = position.lng;
        mapInstanceRef.current?.setZoom(16);
        if (markerRef._AME) placeMarkerAdv(position, markerRef._AME);
        reverseGeocode(position.lat, position.lng);
        setLocating(false);
      },
      () => { alert('Could not fetch location. Pin it manually.'); setLocating(false); }
    );
  };

  useEffect(() => {
    loadGoogleMaps().then(async () => {
      const { Map } = await window.google.maps.importLibrary('maps');
      const { PlaceAutocompleteElement } = await window.google.maps.importLibrary('places');
      const { AdvancedMarkerElement } = await window.google.maps.importLibrary('marker');

      markerRef._AME = AdvancedMarkerElement;

      mapInstanceRef.current = new Map(mapRef.current, {
        center: DEFAULT_CENTER,
        zoom: 13,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        mapId: 'india247map',
      });

      mapInstanceRef.current.addListener('click', (e) => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        latRef.current = lat;
        lngRef.current = lng;
        placeMarkerAdv({ lat, lng }, AdvancedMarkerElement);
        reverseGeocode(lat, lng);
      });

      const placeAutocomplete = new PlaceAutocompleteElement({ includedRegionCodes: ['in'] });
      placeAutocomplete.style.colorScheme = 'light';

      if (autocompleteContainerRef.current) {
        autocompleteContainerRef.current.innerHTML = '';
        autocompleteContainerRef.current.appendChild(placeAutocomplete);
      }

      placeAutocomplete.addEventListener('gmp-select', async ({ placePrediction }) => {
        const place = placePrediction.toPlace();
        await place.fetchFields({ fields: ['formattedAddress', 'location'] });
        const lat = place.location.lat();
        const lng = place.location.lng();
        latRef.current = lat;
        lngRef.current = lng;
        placeMarkerAdv({ lat, lng }, AdvancedMarkerElement);
        mapInstanceRef.current.setZoom(16);
        addressRef.current = place.formattedAddress;
        setAddress(place.formattedAddress);
      });

      setLoading(false);
    }).catch((e) => { console.error(e); setLoading(false); });
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div ref={autocompleteContainerRef} className="gmp-wrapper" />
      <div className="relative rounded-2xl overflow-hidden border border-gray-200" style={{ height: '280px' }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
            <Loader className="animate-spin text-saffron" size={32} />
          </div>
        )}
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      </div>
      {address && (
        <div className="flex items-start gap-2 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 text-sm text-gray-700">
          <MapPin size={16} className="text-saffron mt-0.5 shrink-0" />
          <span>{address}</span>
        </div>
      )}
      <div className="flex gap-3">
        <button
          onClick={handleCurrentLocation}
          disabled={locating}
          className="flex-1 flex items-center justify-center gap-2 btn-primary !bg-saffron disabled:opacity-60"
        >
          {locating ? <Loader size={16} className="animate-spin" /> : <MapPin size={16} />}
          <span>{locating ? 'Locating...' : 'Use My Location'}</span>
        </button>
        <button
          onClick={() => {
            const val = addressRef.current || address;
            if (!val) return alert('Please select a location first.');
            onLocationConfirmed({
              address: val,
              lat: latRef.current,
              lng: lngRef.current
            });
          }}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold transition-colors ${address
              ? 'bg-navy text-white hover:bg-gray-800 cursor-pointer'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
        >
          Confirm Location
        </button>
      </div>
    </div>
  );
};

// ─── Step labels ──────────────────────────────────────────────────────────────
const STEPS = [
  { num: 1, text: 'Describe Issue' },
  { num: 2, text: 'Upload Photo' },
  { num: 3, text: 'AI Verification' },
  { num: 4, text: 'Add Location' },
  { num: 5, text: 'Confirm & Submit' },
];

// ─── Main ReportPage ──────────────────────────────────────────────────────────
const generateTrackingId = () => `IND-2026-${Math.floor(10000 + Math.random() * 90000)}`;

const ReportPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // ── UI state
  const [step, setStep] = useState(1); // 1=chat 2=photo 3=verifying 4=location 5=anon 6=done
  const [messages, setMessages] = useState([
    { isBot: true, text: "Namaste! 🙏 I'm Meera, your India247 assistant. What civic issue are you facing today?", typing: true }
  ]);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isOutOfScope, setIsOutOfScope] = useState(false);

  // ── Photo & verification state
  const [uploadingImage, setUploadingImage] = useState(false);
  const [aiVerifying, setAiVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  // ── Complaint data
  const [detectedIntent, setDetectedIntent] = useState(null); // shown in sidebar
  const [issueSummary, setIssueSummary] = useState('');   // built from conversation
  const [formData, setFormData] = useState({});
  const [complaintSummary, setComplaintSummary] = useState('');
  const [trackingId, setTrackingId] = useState(generateTrackingId());
  const [classification, setClassification] = useState(null);
  const [classifying, setClassifying] = useState(false);

  // ── Refs
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const conversationRef = useRef([]); // full history for Gemini
  const lastCallTimeRef = useRef(0);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, aiVerifying]);

  useEffect(() => {
    // Lock body scroll on mobile to prevent the whole screen from moving when keyboard opens
    const originalStyle = window.getComputedStyle(document.body).overflow;
    const originalHeight = document.body.style.height;
    const originalPosition = document.body.style.position;

    document.body.style.overflow = 'hidden';
    document.body.style.height = '100dvh';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';

    // Use VisualViewport API if available to precisely handle keyboard height
    const handleViewportChange = () => {
      if (window.visualViewport) {
        setViewportHeight(window.visualViewport.height);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      window.visualViewport.addEventListener('scroll', handleViewportChange);
    }

    return () => {
      document.body.style.overflow = originalStyle;
      document.body.style.height = originalHeight;
      document.body.style.position = originalPosition;
      document.body.style.width = '';
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
        window.visualViewport.removeEventListener('scroll', handleViewportChange);
      }
    };
  }, []);

  // ── Add bot message helper
  const addBotMessage = (text, delay = 700) => {
    return new Promise((resolve) => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, { isBot: true, text, typing: true }]);
        resolve();
      }, delay);
    });
  };

  // ── Build a plain-text summary of the conversation for image validation
  const buildIssueSummary = () => {
    return conversationRef.current
      .map(m => `${m.role === 'user' ? 'Citizen' : 'Assistant'}: ${m.content}`)
      .join('\n');
  };

  // ── STEP 1: Handle user chat message ─────────────────────────────────────
  const handleSendMessage = async (e) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || isTyping) return;

    // Throttle
    const now = Date.now();
    if (now - lastCallTimeRef.current < 2000) return;
    lastCallTimeRef.current = now;

    setInputText('');
    setMessages(prev => [...prev, { isBot: false, text }]);

    setIsTyping(true);
    try {
      const rawReply = await callGemini({
        messages: [
          {
            role: "system",
            content: MEERA_SYSTEM_PROMPT
          },
          ...conversationRef.current.map(msg => ({
            role: msg.role === "user" ? "user" : "assistant",
            content: msg.content
          })),
          {
            role: "user",
            content: text
          }
        ]
      });

      conversationRef.current.push({ role: 'user', content: text });
      const { cleanText, readyForPhoto, outOfScope, intent } = parseAIResponse(rawReply);

      // Store AI turn in history (clean text only)
      conversationRef.current.push({ role: 'assistant', content: cleanText });

      // Update detected intent in sidebar
      if (intent) setDetectedIntent(intent);

      setIsTyping(false);
      setMessages(prev => [...prev, { isBot: true, text: cleanText, typing: true }]);

      if (outOfScope) {
        setIsOutOfScope(true);
        return;
      }

      const userTurnCount = conversationRef.current.filter(m => m.role === 'user').length;
      if (readyForPhoto || userTurnCount >= 2) {
        // Save summary before moving to photo step
        setIssueSummary(buildIssueSummary());
        setStep(2);
      }

    } catch (err) {
      setIsTyping(false);
      setMessages(prev => [...prev, { isBot: true, text: `Sorry, I'm having trouble connecting. Please try again. 🙏` }]);
    }
  };

  // ── STEP 2: Photo upload ──────────────────────────────────────────────────
  const handlePhotoUpload = async (e) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploadingImage(true);

    try {
      const previewUrl = URL.createObjectURL(file);
      const [cloudinaryData, compressedDataUrl] = await Promise.all([
        (async () => {
          const data = new FormData();
          data.append("file", file);
          data.append("upload_preset", "India247");
          const res = await fetch("https://api.cloudinary.com/v1_1/dpnupufqv/image/upload", {
            method: "POST",
            body: data
          });
          return res.json();
        })(),
        compressAndResizeImage(file, 1024, 1024, 0.8)
      ]);

      const imageUrl = cloudinaryData?.secure_url;
      if (!imageUrl) {
        throw new Error("Cloudinary upload failed: no secure_url returned");
      }

      setUploadingImage(false);
      setMessages(prev => [...prev, { isBot: false, text: '📸 Photo uploaded', isImage: true, imageUrl: previewUrl }]);
      handleAIVerification(file, imageUrl, compressedDataUrl);
    } catch (err) {
      console.error("Upload or image processing failed", err);
      setUploadingImage(false);
      await addBotMessage("⚠️ Could not upload or process your image. Please check your connection and try again.");
    }
  };

  // ── STEP 3: AI image verification ────────────────────────────────────────
  const handleAIVerification = async (file, imageUrl, base64FullDataUrl) => {
    setStep(3);
    setAiVerifying(true);
    setVerificationResult(null);

    const base64Data = base64FullDataUrl.includes(',')
      ? base64FullDataUrl.split(',')[1]
      : base64FullDataUrl;
    const mediaType = base64FullDataUrl.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';

    const userIssueContext = issueSummary || buildIssueSummary();

    // Comprehensive and strict verification prompt
    const verifyPrompt = `You are a strict civic issue photo verification AI for India247, a civic complaint platform in India.

The citizen has reported this civic issue:
---
${userIssueContext}
---

Your task: Analyze the uploaded photo to determine if it is genuine visual proof of the reported civic issue.

You MUST verify TWO specific criteria:
1. CLARITY (blurCheck):
- true: The photo is clear enough to discern objects, structures, and scenes.
- false: The photo is pitch black, completely blurry, washed out/pure white, corrupted, or completely unintelligible.

2. RELEVANCE (relevanceCheck):
- true: The photo genuinely shows the reported civic issue (e.g. broken/fallen streetlight, pothole, road crater, garbage dump/overflow, water leak/broken pipeline, open drain/manhole, fallen electrical wire, fallen tree, waterlogging, damaged public infrastructure) or immediate on-site context where the problem occurred.
- false: The photo is NOT proof of the reported civic issue.
Examples that MUST FAIL (relevanceCheck: false):
* Selfies, portraits, photos of people or faces
* Food, meals, dishes, kitchen items
* Pets or domestic animals (unless the issue is specifically dead animal or stray cattle menace)
* Indoor rooms, bedrooms, ceilings, furniture, appliances
* Screenshots of phone screens, WhatsApp chats, memes, internet graphics, logos, documents
* Completely unrelated scenes (e.g. user reported a streetlight but uploaded a picture of a laptop or a sandwich)

CRITICAL RULES:
- "passed" MUST be true ONLY if BOTH blurCheck is true AND relevanceCheck is true.
- If relevanceCheck is false, "passed" MUST be false.
- If blurCheck is false, "passed" MUST be false.

Respond ONLY with valid JSON (no markdown formatting, no code fences):
{
  "passed": boolean,
  "blurCheck": boolean,
  "relevanceCheck": boolean,
  "whatISee": "A concise 1-sentence description of what you clearly see in this image",
  "failReason": "If passed is false, a clear polite reason in 1 sentence why this photo does not match the complaint",
  "confidence": "high" | "medium" | "low"
}`;

    try {
      const rawText = await callGeminiVision({ prompt: verifyPrompt, base64Image: base64Data, mediaType });
      const cleaned = rawText.replace(/```json|```/g, '').trim();
      let result;
      try {
        result = JSON.parse(cleaned);
      } catch {
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("Invalid JSON from vision AI: " + cleaned);
        }
      }

      // STRICT ENFORCEMENT: passed can ONLY be true if both blurCheck and relevanceCheck are explicitly true
      result.passed = Boolean(result.blurCheck === true && result.relevanceCheck === true);

      setVerificationResult(result);
      setAiVerifying(false);

      if (result.passed) {
        setFormData(prev => ({ ...prev, imageVerified: true, imageData: imageUrl }));
        setStep(4);
        await addBotMessage(`✅ Image verified! Now please share your location so I can assign your complaint to the right officer.`);
      } else {
        // Build a natural failure message
        let failMsg = `⚠️ I couldn't verify this photo for your complaint. `;
        if (result.whatISee) {
          failMsg += `I see: "${result.whatISee}". `;
        }
        if (result.failReason) {
          failMsg += result.failReason + ' ';
        } else {
          failMsg += `The image doesn't appear to show the civic issue you described. `;
        }
        failMsg += `Please upload a clear photo that shows the actual problem.`;

        setStep(2); // back to photo upload
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (cameraInputRef.current) cameraInputRef.current.value = '';
        await addBotMessage(failMsg, 300);
      }
    } catch (err) {
      console.error("AI Vision verification failed:", err);
      setAiVerifying(false);
      setVerificationResult({
        passed: false,
        blurCheck: false,
        relevanceCheck: false,
        whatISee: 'Verification connection error',
        failReason: 'Could not connect to AI verification service.',
        confidence: 'low'
      });
      setStep(2);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      await addBotMessage(
        `⚠️ Could not verify photo due to a network or server issue. Please check your internet connection and try uploading the photo again.`
      );
    }
  };

  // ── STEP 4: Location confirmed ────────────────────────────────────────────
  const handleLocationConfirmed = async ({ address, lat, lng }) => {
    setFormData(prev => ({ ...prev, location: address, lat, lng }));
    setMessages(prev => [...prev, { isBot: false, text: `📍 ${address}` }]);
    setStep(5);
    await addBotMessage("Almost done! Would you like to keep your identity anonymous? Your complaint will still be filed and tracked fully. 🔒");
  };

  const resetAllState = () => {
    conversationRef.current = [];
    setFormData({});
    setDetectedIntent(null);
    setIssueSummary('');
    setTrackingId(generateTrackingId());
    setMessages([
      { isBot: true, text: "Namaste! 🙏 I'm Meera, your India247 assistant. What civic issue are you facing today?" }
    ]);
    setStep(1);
  };

  // ── STEP 5 → 6: Anonymous choice & submit ────────────────────────────────
  const handleAnonymousSubmit = async (isAnonymous) => {
    setMessages(prev => [...prev, { isBot: false, text: isAnonymous ? '🔒 Yes, keep me anonymous' : '👤 No, use my name' }]);

    // Capture state early before reset
    const currentLoc = formData.location;
    const currentImg = formData.imageData;
    const currentIntent = detectedIntent || extractFallbackIntent(conversationRef.current);

    setFormData(prev => ({ ...prev, anonymous: isAnonymous }));
    setStep(6);
    setIsTyping(true);

    // Build structured conversation context for the summary
    const structuredConversation = conversationRef.current
      .map(m => m.role === 'user' ? `Citizen said: ${m.content}` : `Meera asked: ${m.content}`)
      .join('\n');

    const SUMMARY_SYSTEM_PROMPT = `You are a formal municipal complaint writer for Indian civic authorities.
Do NOT act like a chatbot.
Do NOT include conversational phrases.
Do NOT ask questions.
Write in formal third-person tone only.`;

    const summaryPrompt = `Write a concise formal complaint summary based on the following context.

Context: 
${structuredConversation}

Additional Details:
- Issue Intent: ${currentIntent || 'Civic Issue'}
- Location: ${currentLoc || 'Not specified'}
- Anonymous filing: ${isAnonymous ? 'Yes' : 'No'}

Rules for the summary:
- Start with exactly "This complaint pertains to..."
- Write 3-4 sentences.
- Output the complaint text only. No greetings, no chatbot tone, no preamble, no sign-off, no markdown.`;

    try {
      const rawReply = await callGemini({
        messages: [
          {
            role: "system",
            content: SUMMARY_SYSTEM_PROMPT
          },
          {
            role: "user",
            content: summaryPrompt
          }
        ]
      });
      // Strip any hidden markers and also strip any accidental Meera greeting lines
      let { cleanText } = parseAIResponse(rawReply);
      cleanText = cleanText
        .replace(/^(Namaste!?|Hello!?|Hi!?|I'm Meera[^.]*\.)\s*/i, '')
        .replace(/^(How can I help[^.]*\.)\s*/i, '')
        .replace(/^(Thanks for the details[^.]*\.)\s*/i, '')
        .replace(/^(Please upload a photo[^.]*\.)\s*/i, '')
        .replace(/^(Here is the formal complaint summary:[^.]*\n?)\s*/i, '')
        .trim();
      setComplaintSummary(cleanText);

      try {
        if (!cleanText || !currentLoc) {
          console.error("❌ Missing required fields", { cleanText, currentLoc });
          return;
        }

        setClassifying(true);
        let currentClassification = null;
        try {
          const res = await axios.post(`${API_BASE}/api/complaints/classify-issue`, {
            intent: currentIntent,
            description: cleanText || issueSummary || structuredConversation
          });
          currentClassification = res.data;
          if (!currentClassification || currentClassification.category === "Other Civic Issues") {
            const heuristic = classifyHeuristic(currentIntent, cleanText || issueSummary);
            if (heuristic.category !== "Other Civic Issues") {
              currentClassification = heuristic;
            }
          }
          setClassification(currentClassification);
        } catch (err) {
          console.warn("Classification API failed, falling back to heuristic:", err.message);
          currentClassification = classifyHeuristic(currentIntent, cleanText || issueSummary);
          setClassification(currentClassification);
        }
        setClassifying(false);

        const effectiveTitle = currentIntent 
          ? (currentIntent.charAt(0).toUpperCase() + currentIntent.slice(1))
          : (currentClassification?.category || 'Civic Issue');

        const payload = {
          title: effectiveTitle,
          category: currentClassification?.category || 'Other Civic Issues',
          aiDepartment: currentClassification?.department || 'Municipal Corporation of Delhi (MCD)',
          description: cleanText,
          location: currentLoc || 'Not specified',
          region: deriveRegionFromLocation(currentLoc),
          lat: formData.lat,
          lng: formData.lng,
          imageUrl: currentImg || null,
          status: 'Pending',
          stage: 'Complaint Filed',
          trackingId: trackingId,
          user: {
            name: isAnonymous ? 'Anonymous' : user?.name || 'User',
            uid: user?.uid
          }
        };
        console.log("Submitting complaint...", payload);
        const response = await axios.post(`${API_BASE}/api/complaints`, payload);
        console.log("Complaint saved:", response.data);

      } catch (err) {
        console.error('❌ Error saving complaint:', err.response?.data || err.message);
      }

      setIsTyping(false);
      setMessages(prev => [...prev, { isBot: true, text: "🎉 Your complaint has been successfully filed! Here's your official summary:" }]);
    } catch {
      setIsTyping(false);
      const fallbackSummary = `This complaint pertains to a ${currentIntent || 'civic issue'} reported at ${currentLoc}. The matter has been forwarded to the municipal authorities for prompt inspection and resolution.`;
      setComplaintSummary(fallbackSummary);

      try {
        setClassifying(true);
        let currentClassification = null;
        try {
          const res = await axios.post(`${API_BASE}/api/complaints/classify-issue`, {
            intent: currentIntent,
            description: fallbackSummary || issueSummary
          });
          currentClassification = res.data;
          if (!currentClassification || currentClassification.category === "Other Civic Issues") {
            const heuristic = classifyHeuristic(currentIntent, fallbackSummary);
            if (heuristic.category !== "Other Civic Issues") {
              currentClassification = heuristic;
            }
          }
          setClassification(currentClassification);
        } catch (err) {
          console.warn("Classification API failed, falling back to heuristic:", err.message);
          currentClassification = classifyHeuristic(currentIntent, fallbackSummary);
          setClassification(currentClassification);
        }
        setClassifying(false);

        const effectiveTitle = currentIntent 
          ? (currentIntent.charAt(0).toUpperCase() + currentIntent.slice(1))
          : (currentClassification?.category || 'Civic Issue');

        const payload = {
          title: effectiveTitle,
          category: currentClassification?.category || 'Other Civic Issues',
          aiDepartment: currentClassification?.department || 'Municipal Corporation of Delhi (MCD)',
          description: fallbackSummary,
          location: currentLoc || 'Not specified',
          region: deriveRegionFromLocation(currentLoc),
          lat: formData.lat,
          lng: formData.lng,
          imageUrl: currentImg || null,
          status: 'Pending',
          stage: 'Complaint Filed',
          trackingId: trackingId,
          user: {
            name: isAnonymous ? 'Anonymous' : user?.name || 'User',
            uid: user?.uid
          }
        };
        console.log("Submitting fallback complaint...", payload);
        const response = await axios.post(`${API_BASE}/api/complaints`, payload);
        console.log("Complaint saved:", response.data);

      } catch (err) {
        console.error('❌ Error saving complaint:', err.response?.data || err.message);
      }

      setMessages(prev => [...prev, { isBot: true, text: "🎉 Your complaint has been successfully filed!" }]);
    }
  };

  // ── Sidebar step indicator ─────────────────────────────────────────────────
  // Map internal step numbers to sidebar step numbers
  // Internal: 1=chat, 2=photo, 3=verifying, 4=location, 5=anon, 6=done
  const sidebarStep = step === 1 ? 1 : step === 2 ? 2 : step === 3 ? 3 : step === 4 ? 4 : 5;

  return (
    <div
      className="fixed inset-0 pt-16 bg-[#f7f9fb] flex font-sans overflow-hidden"
      style={{ height: viewportHeight }}
    >

      {/* ── Sidebar ── */}
      <div className="hidden md:block w-80 bg-white border-r border-gray-100 p-8 h-full overflow-y-auto sticky top-16">
        <h2 className="text-xl font-bold text-navy mb-8">Filing Complaint</h2>

        {/* Steps */}
        <div className="space-y-6 mb-10">
          {STEPS.map((s) => {
            const isCompleted = sidebarStep > s.num;
            const isActive = sidebarStep === s.num;
            return (
              <div key={s.num} className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${isCompleted ? 'bg-green-100 text-india-green' :
                    isActive ? 'bg-orange-100 text-saffron ring-2 ring-orange-200' :
                      'bg-gray-100 text-gray-400'
                  }`}>
                  {isCompleted ? '✓' : isActive && s.num === 3 ? '⟳' : s.num}
                </div>
                <span className={`font-semibold text-sm ${isCompleted ? 'text-gray-800' : isActive ? 'text-navy' : 'text-gray-400'
                  }`}>{s.text}</span>
              </div>
            );
          })}
        </div>

        {/* Detected intent and/or classification */}
        {(detectedIntent || classification) && (
          <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100 animate-in fade-in duration-500">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Detected Issue</p>
            <div className="flex flex-col gap-1">
              {detectedIntent && (
                <p className="font-semibold text-navy text-sm capitalize">{detectedIntent}</p>
              )}
              {classification && (
                <div className="mt-1 pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-600 mb-1"><span className="font-semibold text-gray-500">Category:</span> {classification.category}</p>
                  <p className="text-xs text-gray-600"><span className="font-semibold text-gray-500">Dept:</span> {classification.department}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Collected details */}
        {(formData.location || formData.imageVerified) && (
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-sm space-y-2">
            <p className="font-bold text-navy text-xs uppercase tracking-wider mb-3">Complaint Details</p>
            {formData.imageVerified && (
              <p className="text-india-green font-medium flex items-center gap-1.5">
                <span>✓</span> Image verified
              </p>
            )}
            {formData.location && (
              <div className="flex items-start gap-1.5">
                <MapPin size={14} className="text-saffron mt-0.5 shrink-0" />
                <p className="text-gray-600 text-xs leading-relaxed">{formData.location}</p>
              </div>
            )}
          </div>
        )}

        {/* Out of scope note */}
        {isOutOfScope && (
          <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-100 text-sm text-red-700">
            <p className="font-semibold mb-1">Complaint not filed</p>
            <p className="text-xs">This issue is outside the scope of India247. Please use the resource Meera suggested.</p>
          </div>
        )}
      </div>

      {/* ── Chat Area ── */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 lg:p-8">
          <div className="max-w-3xl mx-auto">

            {/* Messages */}
            {messages.map((msg, idx) => (
              <ChatBubble key={idx} isBot={msg.isBot} message={msg.text} typing={msg.typing}>
                {msg.isImage && msg.imageUrl && (
                  <div className="mt-2 flex flex-col gap-2">
                    <img src={msg.imageUrl} alt="Uploaded" className="w-48 h-48 object-cover rounded-xl border border-gray-100 shadow-sm" />
                    {step >= 3 && step < 5 && (
                      <button
                        onClick={() => {
                          setStep(2);
                          setFormData(prev => ({ ...prev, imageVerified: false, imageData: null }));
                          setMessages(prev => prev.slice(0, idx));
                          if (fileInputRef.current) fileInputRef.current.value = '';
                          if (cameraInputRef.current) cameraInputRef.current.value = '';
                        }}
                        className="self-start text-xs font-bold text-gray-500 hover:text-saffron transition-colors bg-white px-4 py-2 border border-gray-200 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.04)] active:scale-95"
                      >
                        Retake Photo
                      </button>
                    )}
                  </div>
                )}
              </ChatBubble>
            ))}

            {/* Typing indicator */}
            {isTyping && !classifying && (
              <ChatBubble isBot={true}>
                <div className="flex space-x-1.5 items-center h-4 ml-1">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </ChatBubble>
            )}

            {/* Classifying issue loader */}
            {classifying && (
              <ChatBubble isBot={true}>
                <div className="flex items-center gap-3 text-saffron font-medium text-sm h-4">
                  <Loader size={16} className="animate-spin" />
                  <span>Classifying issue...</span>
                </div>
              </ChatBubble>
            )}

            {/* AI Verification panel */}
            {(aiVerifying || (verificationResult && (step === 3 || (!verificationResult.passed && step === 2)))) && (
              <div className="ml-10 mr-4 max-w-sm rounded-2xl p-5 mb-6 border border-indigo-100 bg-white shadow-[0_10px_30px_rgba(79,70,229,0.08)]">
                <div className="flex items-center gap-3 font-bold text-gray-800 mb-4 font-heading">
                  {aiVerifying
                    ? <Loader className="text-indigo-500 animate-spin" size={20} />
                    : <span className="text-indigo-500 text-lg">🔍</span>
                  }
                  <span>{aiVerifying ? 'AI Verifying...' : 'Verification Result'}</span>
                </div>

                {aiVerifying && (
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-3 text-gray-500">
                      <Loader size={14} className="animate-spin" />
                      <span>Checking image quality...</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-500">
                      <Loader size={14} className="animate-spin" />
                      <span>Matching image to your description...</span>
                    </div>
                    <div className="h-1.5 w-full bg-indigo-100 rounded-full overflow-hidden mt-3">
                      <div className="h-full bg-indigo-500 animate-pulse rounded-full" style={{ width: '60%' }}></div>
                    </div>
                  </div>
                )}

                {!aiVerifying && verificationResult && (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span>{verificationResult.blurCheck ? '✅' : '❌'}</span>
                      <span className={verificationResult.blurCheck ? 'text-gray-700' : 'text-red-600'}>Image clarity</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{verificationResult.relevanceCheck ? '✅' : '❌'}</span>
                      <span className={verificationResult.relevanceCheck ? 'text-gray-700' : 'text-red-600'}>
                        Matches your description
                      </span>
                    </div>
                    {verificationResult.whatISee && (
                      <p className="text-xs text-gray-500 italic mt-1 bg-gray-50 p-2 rounded-lg border border-gray-100">
                        <span className="font-semibold text-gray-600">Detected:</span> {verificationResult.whatISee}
                      </p>
                    )}
                    {verificationResult.passed
                      ? <p className="mt-3 text-india-green font-semibold">✅ Verified — Confidence: {verificationResult.confidence}</p>
                      : <p className="mt-3 text-red-600 font-medium">⚠️ Please re-upload a relevant photo</p>
                    }
                  </div>
                )}
              </div>
            )}

            {/* Final complaint card */}
            {step === 6 && !isTyping && complaintSummary && (
              <div className="ml-12 mr-4 max-w-lg card mb-8 border-2 border-green-100 bg-green-50/30">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-india-green rounded-full flex items-center justify-center mx-auto mb-4 text-white text-3xl">✓</div>
                  <h3 className="text-xl font-bold text-navy mb-1">Complaint Filed!</h3>
                  <div className="bg-white rounded-lg p-3 inline-block shadow-sm border border-gray-100 mb-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Tracking ID</p>
                    <p className="font-mono font-bold text-lg text-saffron">{trackingId}</p>
                  </div>
                </div>

                {(detectedIntent || classification) && (
                  <div className="flex items-center gap-3 bg-white rounded-xl p-3 border border-gray-100 mb-4">
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Detected Issue</p>
                      {detectedIntent && <p className="font-semibold text-navy text-sm capitalize mb-1">{detectedIntent}</p>}
                      {classification && (
                        <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-50 flex flex-col gap-0.5">
                          <p><span className="font-semibold text-gray-500">Category:</span> {classification.category}</p>
                          <p><span className="font-semibold text-gray-500">Dept:</span> {classification.department}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-xl p-4 border border-gray-100 mb-5 text-sm text-gray-700 leading-relaxed">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Official Complaint Summary</p>
                  <p>{complaintSummary}</p>
                </div>

                <div className="text-sm text-gray-600 mb-5 grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 font-semibold uppercase mb-1">Status</p>
                    <p className="font-medium text-orange-600">Pending Review</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 font-semibold uppercase mb-1">Anonymous</p>
                    <p className="font-medium text-gray-800">{formData.anonymous ? 'Yes' : 'No'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                    <p className="text-xs text-gray-400 font-semibold uppercase mb-1">Location</p>
                    <p className="font-medium text-gray-800">{formData.location}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => navigate('/tracker', { state: { complaintId: trackingId } })}
                    className="btn-primary py-2.5"
                  >
                    Track My Complaint
                  </button>
                  <button onClick={() => resetAllState()} className="text-saffron font-semibold text-sm hover:underline text-center">
                    Report Another Issue
                  </button>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* ── Bottom Input Area ── */}
        {!aiVerifying && step !== 6 && !isOutOfScope && (
          <div className="p-1 sm:p-2 bg-[#f7f9fb]/90 backdrop-blur-xl border-t border-gray-200/50 shrink-0 z-10">
            <div className="max-w-3xl mx-auto">

              {/* Step 1: Free text chat */}
              {step === 1 && (
                <>
                  {conversationRef.current.some(m => m.role === 'user') && (
                    <div className="flex justify-end mb-1.5 px-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIssueSummary(buildIssueSummary());
                          setStep(2);
                        }}
                        className="text-xs font-semibold text-saffron bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-full px-3 py-1 flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <Camera size={13} />
                        <span>Ready to upload photo →</span>
                      </button>
                    </div>
                  )}
                  <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    className="hidden"
                    accept="image/*"
                  />
                  <div className="flex-1 bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.04)] outline outline-1 outline-gray-200 flex items-center px-4 min-h-[2.75rem]">
                    <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                        }
                      }}
                      readOnly={isTyping}
                      placeholder={isTyping ? "Meera is replying..." : "Type your message..."}
                      className={`w-full bg-transparent border-none focus:ring-0 resize-none font-sans text-[15px] text-gray-800 placeholder:text-gray-400 py-3 max-h-32 outline-none ${isTyping ? 'opacity-50' : ''}`}
                      rows="1"
                    ></textarea>
                  </div>
                  <button
                    type="submit"
                    disabled={!inputText.trim() || isTyping}
                    className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-saffron to-[#d14405] text-white shadow-[0_4px_12px_rgba(232,84,26,0.2)] flex items-center justify-center transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={20} className="ml-1" />
                  </button>
                </form>
                </>
              )}

              {/* Step 2: Photo upload */}
              {step === 2 && (
                <div className="px-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    className="hidden"
                    accept="image/*"
                  />
                  <input
                    type="file"
                    ref={cameraInputRef}
                    onChange={handlePhotoUpload}
                    className="hidden"
                    accept="image/*"
                    capture="environment"
                  />
                  {uploadingImage ? (
                    <div className="flex flex-col items-center py-6">
                      <div className="w-10 h-10 border-4 border-saffron border-t-transparent rounded-full animate-spin mb-3"></div>
                      <p className="text-saffron font-bold text-sm">Uploading photo...</p>
                    </div>
                  ) : (
                    <>
                      {/* Desktop drag and drop */}
                      <div
                        className="hidden md:flex flex-col items-center border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer group"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <div className="w-16 h-16 bg-orange-50 text-saffron rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <Camera size={28} />
                        </div>
                        <p className="font-semibold text-gray-700 mb-1">Click to upload a photo of the issue</p>
                        <p className="text-sm text-gray-500">Supports JPG, PNG · Must show the issue you described</p>
                      </div>

                      {/* Mobile Buttons */}
                      <div className="md:hidden flex gap-3">
                        <button
                          onClick={() => cameraInputRef.current?.click()}
                          className="flex-1 py-3 px-4 rounded-xl font-bold bg-gradient-to-br from-saffron to-[#d14405] text-white shadow-[0_4px_12px_rgba(232,84,26,0.2)] active:scale-95 transition-all text-sm"
                        >
                          Take a Photo
                        </button>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="flex-1 py-3 px-4 rounded-xl font-bold bg-white text-saffron border border-gray-200 shadow-sm hover:bg-orange-50 active:scale-95 transition-all text-sm"
                        >
                          Choose from Gallery
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Step 4: Location */}
              {step === 4 && (
                <LocationPicker onLocationConfirmed={handleLocationConfirmed} />
              )}

              {/* Step 5: Anonymous choice */}
              {step === 5 && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => handleAnonymousSubmit(true)}
                    disabled={classifying || isTyping}
                    className="flex-1 py-3 px-4 rounded-xl border-2 border-gray-200 font-semibold text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-60"
                  >
                    🔒 Yes, keep me anonymous
                  </button>
                  <button
                    onClick={() => handleAnonymousSubmit(false)}
                    disabled={classifying || isTyping}
                    className="flex-1 py-3 px-4 rounded-xl border-2 border-saffron bg-orange-50 font-semibold text-saffron hover:bg-orange-100 transition-colors disabled:opacity-60"
                  >
                    👤 No, use my name
                  </button>
                </div>
              )}

            </div>
          </div>
        )}

        {/* Out of scope — show a "start over" option */}
        {isOutOfScope && (
          <div className="p-4 bg-white border-t border-gray-100 shrink-0">
            <div className="max-w-3xl mx-auto text-center">
              <button
                onClick={() => window.location.reload()}
                className="btn-outline"
              >
                Report a Different Issue
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportPage;