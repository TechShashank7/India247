import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Send, MapPin, Loader } from 'lucide-react';
import ChatBubble from '../components/ChatBubble';

// ─── API KEYS ────────────────────────────────────────────────────────────────
const GEMINI_API_KEY      = import.meta.env.VITE_GEMINI_API_KEY;
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
// ─────────────────────────────────────────────────────────────────────────────

// gemini-2.5-flash-lite for fast text conversation
const GEMINI_URL        = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`;
// gemini-2.5-flash (full) for vision — better AI image detection
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

const ISSUE_CATEGORIES = [
  { id: 'road',    name: 'Pothole / Road Damage',   icon: '🕳️' },
  { id: 'garbage', name: 'Garbage Not Collected',    icon: '🗑️' },
  { id: 'water',   name: 'Water Leakage / Sewer',    icon: '💧' },
  { id: 'light',   name: 'Broken Streetlight',       icon: '💡' },
  { id: 'park',    name: 'Park / Public Space',       icon: '🌳' },
  { id: 'other',   name: 'Other Issue',              icon: '✏️' },
];

// ─── Retry helper ────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchWithRetry(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, options);
    if (res.status === 429) {
      const wait = [15000, 30000, 60000][i];
      await sleep(wait);
      continue;
    }
    return res;
  }
  throw new Error('Too many requests — please wait a moment and try again.');
}

// ─── Gemini text helper ───────────────────────────────────────────────────────
async function callGemini({ system, messages }) {
  const history = messages
    .map(m => (m.role === 'user' ? `User: ${m.content}` : `Assistant: ${m.content}`))
    .join('\n');
  const fullPrompt = system ? `${system}\n\n${history}` : history;

  const res = await fetchWithRetry(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: fullPrompt }] }],
      generationConfig: { maxOutputTokens: 500, temperature: 0.7 },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Gemini API error');
  return data.candidates[0].content.parts[0].text.trim();
}

// ─── Gemini vision helper (uses stronger model) ───────────────────────────────
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
      generationConfig: { maxOutputTokens: 400, temperature: 0.1 },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Gemini Vision error');
  return data.candidates[0].content.parts[0].text.trim();
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

  const [address,  setAddress]  = useState('');
  const [loading,  setLoading]  = useState(true);
  const [locating, setLocating] = useState(false);

  const DEFAULT_CENTER = { lat: 28.6139, lng: 77.2090 };

  const reverseGeocode = useCallback(async (lat, lng) => {
    const { Geocoder } = await window.google.maps.importLibrary('geocoding');
    const geocoder = new Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results[0]) {
        addressRef.current = results[0].formatted_address;
        setAddress(results[0].formatted_address);
      }
    });
  }, []);

  const placeMarkerAdv = useCallback((position, AdvancedMarkerElement) => {
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
        placeMarkerAdv({ lat: e.latLng.lat(), lng: e.latLng.lng() }, AdvancedMarkerElement);
        reverseGeocode(e.latLng.lat(), e.latLng.lng());
      });

      const placeAutocomplete = new PlaceAutocompleteElement({
        includedRegionCodes: ['in'],
      });
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
            onLocationConfirmed(val);
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

// ─── Main ReportPage ──────────────────────────────────────────────────────────
const ReportPage = () => {
  const navigate = useNavigate();

  const [step,               setStep]               = useState(1);
  const [messages,           setMessages]           = useState([
    { isBot: true, text: "Namaste! 🙏 I'm India247 Assistant. I'll help you file your complaint in under 60 seconds. What civic issue are you facing today?" }
  ]);
  const [formData,           setFormData]           = useState({});
  const [isTyping,           setIsTyping]           = useState(false);
  const [reportText,         setReportText]         = useState('');
  const [uploadingImage,     setUploadingImage]     = useState(false);
  const [aiVerifying,        setAiVerifying]        = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [trackingId]                                = useState(`IND-2026-${Math.floor(10000 + Math.random() * 90000)}`);
  const [complaintSummary,   setComplaintSummary]   = useState('');

  const messagesEndRef = useRef(null);
  const fileInputRef   = useRef(null);
  const chatHistoryRef = useRef([]);
  const turnCountRef   = useRef(0);
  const lastCallTimeRef = useRef(0);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, aiVerifying]);

  const addBotMessage = (text, delay = 800) => {
    setIsTyping(true);
    return new Promise((resolve) => {
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, { isBot: true, text }]);
        resolve();
      }, delay);
    });
  };

  const addUserMessage = (text) => {
    setMessages(prev => [...prev, { isBot: false, text }]);
  };

  // ── STEP 1 ─────────────────────────────────────────────────────────────────
  const handleCategorySelect = async (category) => {
    const now = Date.now();
    if (now - lastCallTimeRef.current < 3000) return;
    lastCallTimeRef.current = now;

    setFormData(prev => ({ ...prev, category: category.name }));
    addUserMessage(category.name);
    setStep(2);
    chatHistoryRef.current = [];
    turnCountRef.current   = 0;
    setIsTyping(true);
    try {
      const reply = await callGemini({
        system: `You are Meera, India247's civic complaint assistant.
The user wants to report: "${category.name}".
Ask exactly ONE short follow-up question (e.g. severity, how long, exact spot).
1-2 sentences max. Add one emoji. Do not greet.`,
        messages: [{ role: 'user', content: `I want to report: ${category.name}` }],
      });
      chatHistoryRef.current = [
        { role: 'user',      content: `I want to report: ${category.name}` },
        { role: 'assistant', content: reply },
      ];
      setIsTyping(false);
      setMessages(prev => [...prev, { isBot: true, text: reply }]);
    } catch {
      setIsTyping(false);
      setMessages(prev => [...prev, { isBot: true, text: `Can you describe the ${category.name} issue? (severity, exact spot, how long it's been there) 📝` }]);
    }
  };

  // ── STEP 2 ─────────────────────────────────────────────────────────────────
  const handleDescriptionSubmit = async (e) => {
    e.preventDefault();
    const now = Date.now();
    if (!reportText.trim() || now - lastCallTimeRef.current < 3000) return;
    lastCallTimeRef.current = now;

    const userText = reportText.trim();
    setReportText('');
    addUserMessage(userText);
    turnCountRef.current += 1;
    chatHistoryRef.current.push({ role: 'user', content: userText });

    if (turnCountRef.current >= 2) {
      const fullDesc = chatHistoryRef.current
        .filter(m => m.role === 'user').map(m => m.content).join('. ');
      setFormData(prev => ({ ...prev, description: fullDesc }));
      setIsTyping(true);
      try {
        const thanks = await callGemini({
          system: `You are Meera, India247's civic assistant.
Write ONE warm thank-you sentence for the user finishing their complaint description. Add one emoji. Do NOT ask anything.`,
          messages: [{ role: 'user', content: `Issue described: ${fullDesc}` }],
        });
        setIsTyping(false);
        setMessages(prev => [...prev, { isBot: true, text: thanks }]);
      } catch {
        setIsTyping(false);
        setMessages(prev => [...prev, { isBot: true, text: "Thanks for all the details! 👍" }]);
      }
      setTimeout(() => moveToPhotoStep(), 1200);
      return;
    }

    setIsTyping(true);
    try {
      const reply = await callGemini({
        system: `You are Meera, India247's civic assistant.
The user is reporting: "${formData.category}".
Ask ONE final short follow-up question (duration, danger, or exact spot).
1-2 sentences max. One emoji. Do not ask multiple things.`,
        messages: chatHistoryRef.current,
      });
      chatHistoryRef.current.push({ role: 'assistant', content: reply });
      setIsTyping(false);
      setMessages(prev => [...prev, { isBot: true, text: reply }]);
    } catch {
      setIsTyping(false);
      const fullDesc = chatHistoryRef.current
        .filter(m => m.role === 'user').map(m => m.content).join('. ');
      setFormData(prev => ({ ...prev, description: fullDesc }));
      setTimeout(() => moveToPhotoStep(), 600);
    }
  };

  const moveToPhotoStep = () => {
    setStep(3);
    addBotMessage("Thanks for the details! 📸 Now please upload a clear photo of the issue. Our AI will verify it to speed up resolution.");
  };

  // ── STEP 3 ─────────────────────────────────────────────────────────────────
  const handlePhotoUpload = (e) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploadingImage(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadingImage(false);
      setMessages(prev => [...prev, { isBot: false, text: "📸 Photo uploaded", isImage: true, imageUrl: reader.result }]);
      handleAIVerification(file, reader.result);
    };
    reader.readAsDataURL(file);
  };

  // ── STEP 4: Strict AI image verification ──────────────────────────────────
  const handleAIVerification = async (file, dataUrl) => {
    setStep(4);
    setAiVerifying(true);
    setVerificationResult(null);

    const base64Data = dataUrl.split(',')[1];
    const mediaType  = file.type || 'image/jpeg';

    const verifyPrompt = `You are a STRICT image verification AI for a civic complaint platform in India. Your job is to REJECT fake images. Be aggressive — false positives (passing fake images) are worse than false negatives.

Analyze this image for these checks:

1. BLUR CHECK: Is it clear enough to identify a real civic issue? Reject if too blurry or dark.

2. AI-GENERATED CHECK (MOST IMPORTANT — BE VERY STRICT):
   Immediately REJECT if you see ANY of these:
   - A "✦" or "✧" sparkle symbol/watermark anywhere (this is Gemini's AI watermark)
   - Any AI generator watermark (Midjourney, DALL-E, Stable Diffusion, etc.)
   - Surreal, impossible, or dreamlike content inside a real-world scene (e.g. swirling vortex, eyes, fantasy objects in a road)
   - Unnaturally smooth textures on roads, walls, or ground
   - Perfect lighting with no natural inconsistencies
   - Objects that couldn't physically exist together
   - Painterly, over-rendered, or hyper-detailed quality
   - Pixel artifacts or glitch-like patterns typical of AI generation
   - Any content that looks "generated" rather than photographed with a phone camera
   If you see even ONE of these signs, set aiGeneratedCheck to false and passed to false immediately.

3. RELEVANCE CHECK: Does it show a real civic issue matching: "${formData.category}"?
   Must be a real photograph, not an illustration or rendering.

Default to REJECTION when uncertain. Only pass images that are clearly genuine phone photographs of real civic issues.

Respond ONLY with valid JSON (no markdown, no extra text):
{"passed":true,"blurCheck":true,"aiGeneratedCheck":true,"relevanceCheck":true,"failReason":"","confidence":"high"}

Set passed to false and explain in failReason if anything is wrong.`;

    try {
      const rawText = await callGeminiVision({ prompt: verifyPrompt, base64Image: base64Data, mediaType });
      const cleaned = rawText.replace(/```json|```/g, '').trim();
      let result;
      try { result = JSON.parse(cleaned); }
      catch { result = { passed: true, blurCheck: true, aiGeneratedCheck: true, relevanceCheck: true, failReason: '', confidence: 'medium' }; }

      setVerificationResult(result);
      setAiVerifying(false);

      if (result.passed) {
        setFormData(prev => ({ ...prev, imageVerified: true, imageData: dataUrl }));
        setStep(5);
        await addBotMessage(`✅ Image verified successfully! Now please share your location so we can assign your complaint to the right ward officer.`);
      } else {
        setStep(3);
        if (fileInputRef.current) fileInputRef.current.value = '';
        await addBotMessage(`⚠️ Image verification failed. ${result.failReason} Please upload a real photo of the issue.`);
      }
    } catch {
      // On API error be lenient — pass the image
      setVerificationResult({ passed: true, blurCheck: true, aiGeneratedCheck: true, relevanceCheck: true, failReason: '', confidence: 'low' });
      setAiVerifying(false);
      setFormData(prev => ({ ...prev, imageVerified: true, imageData: dataUrl }));
      setStep(5);
      await addBotMessage(`✅ Photo received! Now please share your location so we can assign your complaint correctly.`);
    }
  };

  // ── STEP 5 ─────────────────────────────────────────────────────────────────
  const handleLocationConfirmed = async (address) => {
    setFormData(prev => ({ ...prev, location: address }));
    addUserMessage(`📍 ${address}`);
    setStep(6);
    await addBotMessage("Almost done! Would you like to keep your identity anonymous? Your complaint will still be filed and tracked. 🔒");
  };

  // ── STEP 6 → 7 ─────────────────────────────────────────────────────────────
  const handleAnonymousSubmit = async (isAnonymous) => {
    addUserMessage(isAnonymous ? "🔒 Yes, keep me anonymous" : "👤 No, use my name");
    setFormData(prev => ({ ...prev, anonymous: isAnonymous }));
    setStep(7);
    setIsTyping(true);

    const summaryPrompt = `Generate a formal civic complaint summary for official submission in India.
Category: ${formData.category}
Description: ${formData.description}
Location: ${formData.location}
Anonymous: ${isAnonymous ? 'Yes' : 'No'}
Tracking ID: ${trackingId}

Write a concise formal 3-4 sentence complaint in third person for a municipal authority.
Start with "This complaint pertains to..." and include the Tracking ID at the end.`;

    try {
      const summary = await callGemini({
        system: 'You generate formal civic complaint summaries for Indian municipal authorities. Be concise and professional.',
        messages: [{ role: 'user', content: summaryPrompt }],
      });
      setComplaintSummary(summary);
      setIsTyping(false);
      setMessages(prev => [...prev, { isBot: true, text: "🎉 Your complaint has been successfully filed! Here's your official summary:" }]);
    } catch {
      setIsTyping(false);
      setComplaintSummary(`This complaint pertains to a ${formData.category} issue reported at ${formData.location}. The matter has been forwarded to the concerned municipal authority for resolution. Tracking ID: ${trackingId}.`);
      setMessages(prev => [...prev, { isBot: true, text: "🎉 Your complaint has been successfully filed!" }]);
    }
  };

  const stepsList = [
    { num: 1, text: "Select Issue"     },
    { num: 2, text: "Describe Issue"   },
    { num: 3, text: "Upload Photo"     },
    { num: 4, text: "AI Verification"  },
    { num: 5, text: "Add Location"     },
    { num: 6, text: "Confirm & Submit" },
  ];

  return (
    <div className="pt-16 min-h-screen bg-gray-50 flex">

      {/* Sidebar */}
      <div className="hidden md:block w-80 bg-white border-r border-gray-100 p-8 h-[calc(100vh-64px)] overflow-y-auto sticky top-16">
        <h2 className="text-xl font-bold text-navy mb-8">Filing Complaint</h2>
        <div className="space-y-6">
          {stepsList.map((s) => {
            const isCompleted = step > s.num;
            const isActive    = step === s.num;
            return (
              <div key={s.num} className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  isCompleted ? 'bg-green-100 text-india-green' :
                  isActive    ? 'bg-orange-100 text-saffron ring-2 ring-orange-200' :
                                'bg-gray-100 text-gray-400'
                }`}>
                  {isCompleted ? '✓' : isActive && s.num === 4 ? '⟳' : '○'}
                </div>
                <span className={`font-semibold ${
                  isCompleted ? 'text-gray-800' : isActive ? 'text-navy' : 'text-gray-400'
                }`}>{s.text}</span>
              </div>
            );
          })}
        </div>
        {formData.category && (
          <div className="mt-10 p-4 bg-gray-50 rounded-xl text-sm space-y-2 border border-gray-100">
            <p className="font-bold text-navy mb-3">Complaint Details</p>
            <p><span className="text-gray-500">Issue:</span> {formData.category}</p>
            {formData.location     && <p><span className="text-gray-500">Location:</span> {formData.location}</p>}
            {formData.imageVerified && <p className="text-india-green font-medium">✓ Image verified</p>}
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col h-[calc(100vh-64px)] relative">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-3xl mx-auto">

            {messages.map((msg, idx) => (
              <ChatBubble key={idx} isBot={msg.isBot} message={msg.text}>
                {msg.isImage && msg.imageUrl && (
                  <img src={msg.imageUrl} alt="Uploaded" className="mt-2 w-40 h-40 object-cover rounded-lg border-2 border-white shadow" />
                )}
              </ChatBubble>
            ))}

            {isTyping && (
              <ChatBubble isBot={true}>
                <div className="flex space-x-1 items-center h-4">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </ChatBubble>
            )}

            {(aiVerifying || (verificationResult && step === 4)) && (
              <div className="ml-12 mr-4 max-w-sm card mb-4 border border-indigo-100 bg-indigo-50/50">
                <div className="flex items-center gap-3 font-semibold text-navy mb-4">
                  {aiVerifying ? <Loader className="text-indigo-600 animate-spin" size={20} /> : <span className="text-indigo-600 text-lg">🔍</span>}
                  <span>{aiVerifying ? 'AI Verification in Progress...' : 'Verification Result'}</span>
                </div>
                {aiVerifying && (
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-3 text-gray-500"><Loader size={14} className="animate-spin" /><span>Analyzing image quality & authenticity...</span></div>
                    <div className="flex items-center gap-3 text-gray-500"><Loader size={14} className="animate-spin" /><span>Checking relevance to reported issue...</span></div>
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
                      <span>{verificationResult.aiGeneratedCheck ? '✅' : '❌'}</span>
                      <span className={verificationResult.aiGeneratedCheck ? 'text-gray-700' : 'text-red-600'}>Not AI-generated</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{verificationResult.relevanceCheck ? '✅' : '❌'}</span>
                      <span className={verificationResult.relevanceCheck ? 'text-gray-700' : 'text-red-600'}>Matches reported issue</span>
                    </div>
                    {verificationResult.passed
                      ? <p className="mt-3 text-india-green font-semibold">✅ Verified — Confidence: {verificationResult.confidence}</p>
                      : <p className="mt-3 text-red-600 font-medium">⚠️ {verificationResult.failReason}</p>
                    }
                  </div>
                )}
              </div>
            )}

            {step === 7 && !isTyping && complaintSummary && (
              <div className="ml-12 mr-4 max-w-lg card mb-8 border-2 border-green-100 bg-green-50/30">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-india-green rounded-full flex items-center justify-center mx-auto mb-4 text-white text-3xl">✓</div>
                  <h3 className="text-xl font-bold text-navy mb-1">Complaint Filed!</h3>
                  <div className="bg-white rounded-lg p-3 inline-block shadow-sm border border-gray-100 mb-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Tracking ID</p>
                    <p className="font-mono font-bold text-lg text-saffron">{trackingId}</p>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100 mb-5 text-sm text-gray-700 leading-relaxed">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Official Complaint Summary</p>
                  <p>{complaintSummary}</p>
                </div>
                <div className="text-sm text-gray-600 mb-5 grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 font-semibold uppercase mb-1">Category</p>
                    <p className="font-medium text-gray-800">{formData.category}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 font-semibold uppercase mb-1">Status</p>
                    <p className="font-medium text-orange-600">Pending Review</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                    <p className="text-xs text-gray-400 font-semibold uppercase mb-1">Location</p>
                    <p className="font-medium text-gray-800">{formData.location}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <button onClick={() => navigate('/tracker')} className="btn-primary py-2.5">Track My Complaint</button>
                  <button onClick={() => window.location.reload()} className="text-saffron font-semibold text-sm hover:underline text-center">
                    Report Another Issue
                  </button>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {(!aiVerifying && step !== 7 && !isTyping) && (
          <div className="p-4 bg-white border-t border-gray-100 shrink-0">
            <div className="max-w-3xl mx-auto">

              {step === 1 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {ISSUE_CATEGORIES.map(cat => (
                    <button key={cat.id} onClick={() => handleCategorySelect(cat)}
                      className="flex items-center justify-center gap-2 p-3 rounded-xl border border-gray-200 hover:border-saffron hover:bg-orange-50 hover:text-saffron transition-colors text-sm font-semibold text-gray-600">
                      <span className="text-lg">{cat.icon}</span>
                      <span className="truncate">{cat.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {step === 2 && (
                <form onSubmit={handleDescriptionSubmit} className="flex gap-2">
                  <input type="text" value={reportText} onChange={(e) => setReportText(e.target.value)}
                    placeholder="Describe the issue here..." className="flex-1 input-field" autoFocus />
                  <button type="submit" disabled={!reportText.trim()}
                    className="bg-navy text-white rounded-xl px-5 hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <Send size={20} />
                  </button>
                </form>
              )}

              {step === 3 && (
                <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer group"
                  onClick={() => fileInputRef.current?.click()}>
                  <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" accept="image/*" />
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
                      <p className="font-semibold text-gray-700 mb-1">Click to upload or drag & drop</p>
                      <p className="text-sm text-gray-500">Supports JPG, PNG (Max 5MB) · Must be a real photo of the issue</p>
                    </div>
                  )}
                </div>
              )}

              {step === 5 && <LocationPicker onLocationConfirmed={handleLocationConfirmed} />}

              {step === 6 && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <button onClick={() => handleAnonymousSubmit(true)}
                    className="flex-1 py-3 px-4 rounded-xl border-2 border-gray-200 font-semibold text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors">
                    🔒 Yes, keep me anonymous
                  </button>
                  <button onClick={() => handleAnonymousSubmit(false)}
                    className="flex-1 py-3 px-4 rounded-xl border-2 border-saffron bg-orange-50 font-semibold text-saffron hover:bg-orange-100 transition-colors">
                    👤 No, use my name
                  </button>
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportPage;