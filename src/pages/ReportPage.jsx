import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Send, MapPin, Loader } from 'lucide-react';
import axios from 'axios';
import ChatBubble from '../components/ChatBubble';
import { useAuth } from '../context/AuthContext';

// ─── API KEYS ────────────────────────────────────────────────────────────────
const GEMINI_API_KEY      = import.meta.env.VITE_GEMINI_API_KEY;
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
// ─────────────────────────────────────────────────────────────────────────────

const GEMINI_URL        = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`;
const GEMINI_VISION_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

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
1. The first message in the conversation is already sent. Do NOT greet or re-introduce yourself in any subsequent message. Never say "Namaste", "Hi", "Hello", "I'm Meera" again after the first turn.
2. Ask follow-up questions naturally to gather: exact location/area, severity, how long the issue has existed, any safety risk. Ask EXACTLY ONE question per message. Never combine two questions in the same message.
3. IMPORTANT: Only emit [READY_FOR_PHOTO] AFTER the user has answered your last question.

STRICT RULE:
- If your message contains ANY question (even polite ones like "could you", "can you", "kya aap", etc.), DO NOT include [READY_FOR_PHOTO].
- The final message must be a statement, NOT a question.

4. When you have gathered enough details (usually after 2-4 user replies), send ONE final acknowledgement message requesting a photo.

The final message MUST:
- NOT contain any question
- Be a clear instruction (e.g., "Please upload a photo of the issue.")
- End with [READY_FOR_PHOTO]

Correct example:
"Thanks for the details. Please upload a photo of the issue so I can proceed. [READY_FOR_PHOTO]"

Incorrect example (DO NOT DO THIS):
"Could you please upload a photo? [READY_FOR_PHOTO]"
5. Never mention "[READY_FOR_PHOTO]" explicitly to the user — it's a hidden signal.

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

LANGUAGE:
* Detect the user's language automatically
* If English → reply in English
* If Hinglish → reply in Hinglish
* If Hindi → reply in Hindi (Devanagari)
* Always mirror user's style naturally
* Do NOT default to English`;

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

// ─── Gemini text helper ───────────────────────────────────────────────────────
async function callGemini({ messages }) {
  const systemMsg = messages.find(m => m.role === 'system');
  const chatMsgs = messages.filter(m => m.role !== 'system');

  const historyText = chatMsgs
    .map(m => `${m.role === 'user' ? 'User' : 'Meera'}: ${m.content}`)
    .join('\n');

  const fullPrompt = `${systemMsg ? systemMsg.content : MEERA_SYSTEM_PROMPT}\n\n--- CONVERSATION ---\n${historyText}\nMeera:`;

  const res = await fetchWithRetry(GEMINI_URL, {
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

// ─── Gemini vision helper ─────────────────────────────────────────────────────
async function callGeminiVision({ prompt, base64Image, mediaType }) {
  const res = await fetchWithRetry(GEMINI_VISION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inline_data: { mime_type: mediaType, data: base64Image } },
          { text: prompt },
        ],
      }],
      generationConfig: { maxOutputTokens: 1000, temperature: 0.1 },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Gemini Vision error');
  return data.candidates[0].content.parts[0].text.trim();
}

// ─── Parse hidden markers from AI response ────────────────────────────────────
function parseAIResponse(rawText) {
  let cleanText = rawText;
  let readyForPhoto = false;
  let outOfScope = false;
  let intent = null;

  // Check for [READY_FOR_PHOTO]
  if (cleanText.includes('[READY_FOR_PHOTO]')) {
    readyForPhoto = true;
    cleanText = cleanText.replace('[READY_FOR_PHOTO]', '').trim();
  }

  // Check for [OUT_OF_SCOPE]
  if (cleanText.includes('[OUT_OF_SCOPE]')) {
    outOfScope = true;
    cleanText = cleanText.replace('[OUT_OF_SCOPE]', '').trim();
  }

  // Check for [INTENT: "..."]
  const intentMatch = cleanText.match(/\[INTENT:\s*"([^"]+)"\]/);
  if (intentMatch) {
    intent = intentMatch[1].trim();
    cleanText = cleanText.replace(intentMatch[0], '').trim();
  }

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
    script.id  = 'gmap-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=maps,places,marker&v=weekly&callback=__googleMapsCallback`;
    script.async = true;
    script.defer = true;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// ─── Location Picker ──────────────────────────────────────────────────────────
const LocationPicker = ({ onLocationConfirmed }) => {
  const mapRef                   = useRef(null);
  const mapInstanceRef           = useRef(null);
  const markerRef                = useRef(null);
  const autocompleteContainerRef = useRef(null);
  const addressRef               = useRef('');
  const latRef                   = useRef(null);
  const lngRef                   = useRef(null);

  const [address,  setAddress]  = useState('');
  const [loading,  setLoading]  = useState(true);
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
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold transition-colors ${
            address
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
  { num: 1, text: 'Describe Issue'   },
  { num: 2, text: 'Upload Photo'     },
  { num: 3, text: 'AI Verification'  },
  { num: 4, text: 'Add Location'     },
  { num: 5, text: 'Confirm & Submit' },
];

// ─── Main ReportPage ──────────────────────────────────────────────────────────
const generateTrackingId = () => `IND-2026-${Math.floor(10000 + Math.random() * 90000)}`;

const ReportPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // ── UI state
  const [step,               setStep]               = useState(1); // 1=chat 2=photo 3=verifying 4=location 5=anon 6=done
  const [messages,           setMessages]           = useState([
    { isBot: true, text: "Namaste! 🙏 I'm Meera, your India247 assistant. What civic issue are you facing today?" }
  ]);
  const [inputText,          setInputText]          = useState('');
  const [isTyping,           setIsTyping]           = useState(false);
  const [isOutOfScope,       setIsOutOfScope]       = useState(false);

  // ── Photo & verification state
  const [uploadingImage,     setUploadingImage]     = useState(false);
  const [aiVerifying,        setAiVerifying]        = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  // ── Complaint data
  const [detectedIntent,     setDetectedIntent]     = useState(null); // shown in sidebar
  const [issueSummary,       setIssueSummary]       = useState('');   // built from conversation
  const [formData,           setFormData]           = useState({});
  const [complaintSummary,   setComplaintSummary]   = useState('');
  const [trackingId,         setTrackingId]         = useState(generateTrackingId());
  const [classification,     setClassification]     = useState(null);
  const [classifying,        setClassifying]        = useState(false);

  // ── Refs
  const messagesEndRef   = useRef(null);
  const fileInputRef     = useRef(null);
  const conversationRef  = useRef([]); // full history for Gemini
  const lastCallTimeRef  = useRef(0);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, aiVerifying]);

  // ── Add bot message helper
  const addBotMessage = (text, delay = 700) => {
    return new Promise((resolve) => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, { isBot: true, text }]);
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
      setMessages(prev => [...prev, { isBot: true, text: cleanText }]);

      if (outOfScope) {
        setIsOutOfScope(true);
        return;
      }

      if (readyForPhoto) {
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
      const data = new FormData();
      data.append("file", file);
      data.append("upload_preset", "India247");

      const res = await fetch("https://api.cloudinary.com/v1_1/dpnupufqv/image/upload", {
        method: "POST",
        body: data
      });

      const cloudinaryData = await res.json();
      const imageUrl = cloudinaryData.secure_url;

      const previewUrl = URL.createObjectURL(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadingImage(false);
        setMessages(prev => [...prev, { isBot: false, text: '📸 Photo uploaded', isImage: true, imageUrl: previewUrl }]);
        handleAIVerification(file, imageUrl, reader.result);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Cloudinary upload failed", err);
      setUploadingImage(false);
    }
  };

  // ── STEP 3: AI image verification ────────────────────────────────────────
  const handleAIVerification = async (file, imageUrl, base64FullDataUrl) => {
    setStep(3);
    setAiVerifying(true);
    setVerificationResult(null);

    const base64Data = base64FullDataUrl.split(',')[1];
    const mediaType  = file.type || 'image/jpeg';

    // Build a rich prompt using the actual conversation
    const verifyPrompt = `You are an image verification AI for India247, a civic complaint platform in India.

A citizen has described their civic issue through this conversation:
---
${issueSummary || buildIssueSummary()}
---

Now analyze the uploaded image against this described issue.

Perform these checks:
1. CLARITY (blurCheck): Is the image clear enough for a municipal officer to assess the problem? PASS if the subject is visible; FAIL if totally blurry, pitch dark, or incomprehensible.
2. RELEVANCE (relevanceCheck): Does the image actually show what the citizen described? Compare the image content with their description. PASS if there is a reasonable match (even partial). FAIL if the image is completely unrelated — e.g. they described a pothole but uploaded a selfie, or described garbage but uploaded a food photo.

If relevanceCheck fails, describe briefly what you actually see in the image (1 sentence) so Meera can tell the user.

Respond ONLY with this exact JSON (no markdown, no extra text):
{"passed":true,"blurCheck":true,"relevanceCheck":true,"whatISee":"","failReason":"","confidence":"high"}

- passed: true only if BOTH checks pass
- whatISee: brief description of what you see in the image (always fill this)
- failReason: if passed is false, a short friendly reason why`;

    try {
      const rawText = await callGeminiVision({ prompt: verifyPrompt, base64Image: base64Data, mediaType });
      const cleaned = rawText.replace(/```json|```/g, '').trim();
      let result;
      try {
        result = JSON.parse(cleaned);
        // Enforce: passed must be true only if BOTH checks pass
        result.passed = result.blurCheck === true && result.relevanceCheck === true;
      } catch {
        // fallback using raw text instead of blind rejection
        const lower = cleaned.toLowerCase();

        result = {
          blurCheck: true,
          relevanceCheck: !(
            lower.includes("logo") ||
            lower.includes("selfie") ||
            lower.includes("indoor")
          ),
          whatISee: cleaned,
          failReason: "Could not fully verify, but attempting fallback.",
          confidence: "low"
        };

        result.passed = result.relevanceCheck;
      }

      setVerificationResult(result);
      setAiVerifying(false);

      if (result.passed) {
        setFormData(prev => ({ ...prev, imageVerified: true, imageData: imageUrl }));
        setStep(4);
        await addBotMessage(`✅ Image verified! Now please share your location so I can assign your complaint to the right officer.`);
      } else {
        // Build a natural failure message
        let failMsg = `⚠️ I couldn't verify your photo. `;
        if (result.whatISee) {
          failMsg += `It looks like the image shows: "${result.whatISee}". `;
        }
        if (result.failReason) {
          failMsg += result.failReason + ' ';
        }
        failMsg += `Could you please upload a photo that clearly shows the issue you described?`;

        setStep(2); // back to photo upload
        if (fileInputRef.current) fileInputRef.current.value = '';
        await addBotMessage(failMsg, 400);
      }
    } catch {
      // On API error, be lenient
      setVerificationResult({ passed: true, blurCheck: true, relevanceCheck: true, whatISee: '', failReason: '', confidence: 'low' });
      setAiVerifying(false);
      setFormData(prev => ({ ...prev, imageVerified: true, imageData: imageUrl }));
      setStep(4);
      await addBotMessage(`✅ Photo received! Now please share your location so I can route your complaint correctly.`);
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
    const currentIntent = detectedIntent;

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
      // Safety net: if Gemini still prepended a greeting line, remove it
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
          const res = await axios.post('https://api.india247.shashankraj.in/api/complaints/classify-issue', {
            intent: currentIntent,
            description: issueSummary
          });
          currentClassification = res.data;
          setClassification(res.data);
        } catch (err) {
          console.error("Classification failed:", err);
          currentClassification = {
            category: "Other Civic Issues",
            department: "Municipal Corporation",
            confidence: "low"
          };
          setClassification(currentClassification);
        }
        setClassifying(false);

        const payload = {
          title: currentClassification?.category || currentIntent || 'Civic Issue',
          category: currentClassification?.department || 'Municipal Corporation',
          description: cleanText,
          location: currentLoc || 'Not specified',
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
        console.log("Submitting complaint...");
        console.log("Payload:", payload);
        const response = await axios.post('https://api.india247.shashankraj.in/api/complaints', payload);
        console.log("Complaint saved:", response.data);

      } catch (err) {
        console.error('❌ Error saving complaint:', err.response?.data || err.message);
      }

      setIsTyping(false);
      setMessages(prev => [...prev, { isBot: true, text: "🎉 Your complaint has been successfully filed! Here's your official summary:" }]);
    } catch {
      setIsTyping(false);
      const fallbackSummary = `This complaint pertains to a civic issue reported at ${currentLoc}. The matter has been forwarded to the Municipal Corporation for resolution.`;
      setComplaintSummary(fallbackSummary);
      
      try {
        setClassifying(true);
        let currentClassification = null;
        try {
          const res = await axios.post('https://api.india247.shashankraj.in/api/complaints/classify-issue', {
            intent: currentIntent,
            description: issueSummary
          });
          currentClassification = res.data;
          setClassification(res.data);
        } catch (err) {
          console.error("Classification failed:", err);
          currentClassification = {
            category: "Other Civic Issues",
            department: "Municipal Corporation",
            confidence: "low"
          };
          setClassification(currentClassification);
        }
        setClassifying(false);

        const payload = {
          title: currentClassification?.category || currentIntent || 'Civic Issue',
          category: currentClassification?.department || 'Municipal Corporation',
          description: fallbackSummary,
          location: currentLoc || 'Not specified',
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
        console.log("Submitting complaint...");
        console.log("Payload:", payload);
        const response = await axios.post('https://api.india247.shashankraj.in/api/complaints', payload);
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
    <div className="pt-16 min-h-screen bg-gray-50 flex">

      {/* ── Sidebar ── */}
      <div className="hidden md:block w-80 bg-white border-r border-gray-100 p-8 h-[calc(100vh-64px)] overflow-y-auto sticky top-16">
        <h2 className="text-xl font-bold text-navy mb-8">Filing Complaint</h2>

        {/* Steps */}
        <div className="space-y-6 mb-10">
          {STEPS.map((s) => {
            const isCompleted = sidebarStep > s.num;
            const isActive    = sidebarStep === s.num;
            return (
              <div key={s.num} className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  isCompleted ? 'bg-green-100 text-india-green' :
                  isActive    ? 'bg-orange-100 text-saffron ring-2 ring-orange-200' :
                                'bg-gray-100 text-gray-400'
                }`}>
                  {isCompleted ? '✓' : isActive && s.num === 3 ? '⟳' : s.num}
                </div>
                <span className={`font-semibold text-sm ${
                  isCompleted ? 'text-gray-800' : isActive ? 'text-navy' : 'text-gray-400'
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
      <div className="flex-1 flex flex-col h-[calc(100vh-64px)] relative">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-3xl mx-auto">

            {/* Messages */}
            {messages.map((msg, idx) => (
              <ChatBubble key={idx} isBot={msg.isBot} message={msg.text}>
                {msg.isImage && msg.imageUrl && (
                  <img src={msg.imageUrl} alt="Uploaded" className="mt-2 w-40 h-40 object-cover rounded-lg border-2 border-white shadow" />
                )}
              </ChatBubble>
            ))}

            {/* Typing indicator */}
            {isTyping && !classifying && (
              <ChatBubble isBot={true}>
                <div className="flex space-x-1 items-center h-4">
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
            {(aiVerifying || (verificationResult && step === 3)) && (
              <div className="ml-12 mr-4 max-w-sm card mb-4 border border-indigo-100 bg-indigo-50/50">
                <div className="flex items-center gap-3 font-semibold text-navy mb-4">
                  {aiVerifying
                    ? <Loader className="text-indigo-600 animate-spin" size={20} />
                    : <span className="text-indigo-600 text-lg">🔍</span>
                  }
                  <span>{aiVerifying ? 'AI Verification in Progress...' : 'Verification Result'}</span>
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
        {!aiVerifying && step !== 6 && !isTyping && !isOutOfScope && (
          <div className="p-4 bg-white border-t border-gray-100 shrink-0">
            <div className="max-w-3xl mx-auto">

              {/* Step 1: Free text chat */}
              {step === 1 && (
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Describe your issue in your own words..."
                    className="flex-1 input-field"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className="bg-navy text-white rounded-xl px-5 hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={20} />
                  </button>
                </form>
              )}

              {/* Step 2: Photo upload */}
              {step === 2 && (
                <div
                  className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    className="hidden"
                    accept="image/*"
                  />
                  {uploadingImage ? (
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 border-4 border-saffron border-t-transparent rounded-full animate-spin mb-3"></div>
                      <p className="text-saffron font-semibold">Uploading photo...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-orange-50 text-saffron rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Camera size={28} />
                      </div>
                      <p className="font-semibold text-gray-700 mb-1">Click to upload a photo of the issue</p>
                      <p className="text-sm text-gray-500">Supports JPG, PNG · Must show the issue you described</p>
                    </div>
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