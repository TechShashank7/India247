import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { RefreshCw, CheckCircle2 } from 'lucide-react';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

function loadGoogleMaps() {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) return resolve();
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

const getMarkerColor = (status) => {
  switch(status) {
    case 'Pending': return 'red';
    case 'In Progress': return 'orange';
    case 'Under Inspection': return 'violet';
    case 'Assigned': return 'blue';
    case 'Resolved': return 'green';
    default: return 'grey';
  }
};

const MapPage = () => {
  const [complaints, setComplaints] = useState([]);
  const [filteredComplaints, setFilteredComplaints] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const navigate = useNavigate();
  
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const activeComplaintRef = useRef(null);
  const markersRef = useRef([]);
  const clustererRef = useRef(null);
  const infoWindowRef = useRef(null);
  const hasAutoCentered = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  
  const fetchComplaints = async () => {
    setLoading(true);
    setSuccess(false);

    try {
      const res = await axios.get('/api/complaints');
      setComplaints(res.data);
      setFilteredComplaints(res.data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 1200);
    } catch (err) {
      console.error('Error fetching complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  useEffect(() => {
    let temp = [...complaints];

    if (statusFilter !== "All") {
      temp = temp.filter(c => c.status === statusFilter);
    }

    if (categoryFilter !== "All") {
      temp = temp.filter(c => c.category === categoryFilter);
    }

    setFilteredComplaints(temp);
  }, [statusFilter, categoryFilter, complaints]);

  const categories = ["All", ...new Set(complaints.filter(c => c.category).map(c => c.category))];

  const oldestPending = complaints
    .filter(c => c.status === "Pending")
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0];

  const mostUpvoted = complaints
    .sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0))[0];

  useEffect(() => {
    loadGoogleMaps().then(() => {
      if (!mapInstanceRef.current && mapRef.current) {
        mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
          center: { lat: 28.6139, lng: 77.2090 },
          zoom: 12,
        });
        setMapReady(true);
      }
    }).catch(e => console.error(e));
  }, []);

  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !window.google) return;

    if (!infoWindowRef.current) {
      infoWindowRef.current = new window.google.maps.InfoWindow();
    }

    // Clear existing markers and clusters
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
      clustererRef.current.setMap(null);
    }

    const bounds = new window.google.maps.LatLngBounds();

    filteredComplaints.filter(c => c.lat && c.lng).forEach(complaint => {
      const color = getMarkerColor(complaint.status);
      const markerColorName = color === 'violet' ? 'purple' : color === 'grey' ? 'red' : color;
      
      const position = { lat: parseFloat(complaint.lat), lng: parseFloat(complaint.lng) };

      const createdDate = new Date(complaint.createdAt || Date.now());
      const isOlderThan3Days = (Date.now() - createdDate.getTime()) > (3 * 24 * 60 * 60 * 1000);
      const isUrgent = complaint.status === 'Pending' && isOlderThan3Days;

      const markerOptions = {
        position,
        map: mapInstanceRef.current,
      };

      if (isUrgent) {
        markerOptions.icon = {
          url: `http://maps.google.com/mapfiles/ms/icons/red-dot.png`,
          scaledSize: new window.google.maps.Size(46, 46)
        };
        markerOptions.label = {
          text: "URGENT",
          color: "#b91c1c",
          fontSize: "10px",
          fontWeight: "900",
          className: "bg-white px-1 rounded shadow-sm border border-red-200"
        };
      } else {
        markerOptions.icon = `http://maps.google.com/mapfiles/ms/icons/${markerColorName}-dot.png`;
      }

      const marker = new window.google.maps.Marker(markerOptions);

      bounds.extend(position);

      marker.addListener("click", () => {
        activeComplaintRef.current = complaint._id;
        const isResolved = complaint.status === 'Resolved';
        const isInProgress = complaint.status === 'In Progress';
        const bgColors = isResolved ? '#dcfce7' : isInProgress ? '#ffedd5' : '#fee2e2';
        const textColors = isResolved ? '#15803d' : isInProgress ? '#c2410c' : '#b91c1c';

        const content = `
          <div style="min-width: 200px; padding: 4px; font-family: ui-sans-serif, system-ui, sans-serif;">
            <div style="font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.05em;">
              ${complaint.category || 'Category'}
            </div>
            <h3 style="font-weight: 600; color: #111827; font-size: 16px; line-height: 1.25; margin: 0 0 8px 0;">
              ${complaint.title}
            </h3>
            <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #6b7280; margin-bottom: 12px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FF6B35" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              <span>${complaint.location}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f3f4f6; padding-top: 12px; margin-top: 12px;">
              <span style="font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 9999px; background-color: ${bgColors}; color: ${textColors};">
                ${complaint.status}
              </span>
              <span style="display: flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 700; color: #9ca3af;">
                👍 ${complaint.upvotes || 0}
              </span>
            </div>
            <button id="view-details-btn" style="width: 100%; margin-top: 12px; background-color: #111827; color: white; font-size: 12px; font-weight: 600; padding: 10px; border-radius: 8px; border: none; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.backgroundColor='#374151'" onmouseout="this.style.backgroundColor='#111827'">
              View Live Tracker
            </button>
          </div>
        `;
        infoWindowRef.current.setContent(content);
        infoWindowRef.current.open(mapInstanceRef.current, marker);

        // Add listener for the button after InfoWindow is ready
        window.google.maps.event.addListenerOnce(infoWindowRef.current, 'domready', () => {
          const btn = document.getElementById('view-details-btn');
          if (btn) {
            btn.addEventListener('click', () => {
              navigate("/tracker", { state: { complaintId: complaint.trackingId } });
            });
          }
        });
      });

      markersRef.current.push(marker);
    });

    clustererRef.current = new MarkerClusterer({
      map: mapInstanceRef.current,
      markers: markersRef.current,
    });

    if (!bounds.isEmpty() && !hasAutoCentered.current) {
      mapInstanceRef.current.fitBounds(bounds);
      hasAutoCentered.current = true;
    }
  }, [filteredComplaints, mapReady]);

  return (
    <div className="pt-16 min-h-screen bg-gray-50 flex flex-col md:flex-row relative">
      {/* LEFT SECTION (MAP AREA) */}
      <div className="flex-1 md:w-[70%] flex flex-col">
        {/* Filters & Refresh Bar */}
        <div className="bg-white border-b border-gray-100 shadow-sm z-10 px-4 py-2">
          <div className="flex items-center justify-between gap-2 max-w-full">
            {/* Scrollable Filters on the left */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {['All', 'Pending', 'In Progress', 'Resolved'].map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                    statusFilter === f 
                      ? 'bg-navy text-white border-navy shadow-sm' 
                      : 'bg-gray-50 text-gray-600 border-gray-100 hover:bg-gray-100'
                  }`}
                >
                  {f}
                </button>
              ))}
              <select 
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 rounded-full text-xs font-bold bg-gray-50 text-gray-600 border border-gray-100 outline-none hover:bg-gray-100 cursor-pointer min-w-[90px]"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            {/* Refresh Button on the right */}
            <button
              onClick={fetchComplaints}
              disabled={loading || success}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-bold transition-all shadow-sm shrink-0 whitespace-nowrap text-xs ${
                success 
                  ? 'bg-green-50 text-india-green border-green-200' 
                  : 'bg-white text-navy hover:bg-gray-50 border-gray-200'
              } ${loading || success ? 'opacity-80 cursor-wait' : 'cursor-pointer'}`}
            >
               {success ? (
                 <>
                   <CheckCircle2 size={14} className="text-india-green" />
                   <span>Updated</span>
                 </>
               ) : (
                 <>
                   <RefreshCw size={14} className={`text-navy ${loading ? 'animate-spin' : ''}`} />
                   <span>{loading ? 'Refreshing' : 'Refresh'}</span>
                 </>
               )}
            </button>
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 w-full bg-gray-200 relative z-0 min-h-[400px]">
          <div ref={mapRef} className="h-[500px] md:h-full w-full" />
        </div>
      </div>

      {/* MOBILE INSIGHTS FAB - Outside map container to ensure visibility */}
      <button
        onClick={() => setIsPanelOpen(true)}
        className="md:hidden fixed bottom-24 right-5 bg-navy text-white px-6 py-3.5 rounded-full shadow-[0_8px_25px_rgba(15,52,96,0.3)] z-[1001] font-bold text-sm flex items-center gap-2 animate-in slide-in-from-bottom-4 duration-500"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 3 18 18"/><path d="M15 3h6v6"/><path d="M9 21H3v-6"/></svg>
        Insights
      </button>

      {/* RIGHT PANEL (DESKTOP ONLY) */}
      <div className="hidden md:flex md:w-[30%] flex-col border-l border-gray-100 bg-white p-6 gap-4 overflow-y-auto">
        <h2 className="text-lg font-bold text-navy mb-2">Live Insights</h2>
        
        {oldestPending && (
          <div className="bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-md border border-red-100">
            <p className="text-xs font-bold text-red-500 uppercase tracking-widest mb-1">Oldest Pending</p>
            <p className="text-lg font-bold text-red-700 leading-tight">
              {oldestPending.title}
              <br/>
              <span className="text-sm font-medium opacity-80 mt-1 block">
                {oldestPending.location}
              </span>
            </p>
          </div>
        )}
        
        {mostUpvoted && (
          <div className="bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-md border border-orange-100">
            <p className="text-xs font-bold text-saffron uppercase tracking-widest mb-1">Most Upvoted</p>
            <p className="text-lg font-bold text-gray-800 leading-tight">
              {mostUpvoted.title}
              <br/>
              <span className="text-sm font-medium text-gray-500 mt-1 block">
                👍 {mostUpvoted.upvotes || 0} upvotes
              </span>
            </p>
          </div>
        )}
      </div>

      {/* MOBILE BOTTOM SHEET */}
      <div 
        className={`fixed inset-x-0 bottom-0 z-[1002] transform transition-transform duration-300 ${
          isPanelOpen ? 'translate-y-0' : 'translate-y-full'
        } md:hidden`}
      >
        {/* Backdrop for mobile panel */}
        {isPanelOpen && (
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[-1]" 
            onClick={() => setIsPanelOpen(false)}
          />
        )}
        <div className="bg-white rounded-t-[2.5rem] p-6 shadow-[0_-15px_30px_rgba(0,0,0,0.15)] max-h-[70vh] overflow-y-auto border-t border-gray-100">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
          </div>
          
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-black text-navy font-semibold text-lg">Live Insights</h2>
            <button 
              onClick={() => setIsPanelOpen(false)}
              className="w-10 h-10 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-full flex items-center justify-center transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {oldestPending && (
              <div className="bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-md border border-red-100">
                <p className="text-xs font-bold text-red-500 uppercase tracking-widest mb-1">Oldest Pending</p>
                <p className="text-lg font-bold text-red-700 leading-tight">
                  {oldestPending.title}
                  <br/>
                  <span className="text-sm font-medium opacity-80 mt-1 block">
                    {oldestPending.location}
                  </span>
                </p>
              </div>
            )}
            
            {mostUpvoted && (
              <div className="bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-md border border-orange-100">
                <p className="text-xs font-bold text-saffron uppercase tracking-widest mb-1">Most Upvoted</p>
                <p className="text-lg font-bold text-gray-800 leading-tight">
                  {mostUpvoted.title}
                  <br/>
                  <span className="text-sm font-medium text-gray-500 mt-1 block">
                    👍 {mostUpvoted.upvotes || 0} upvotes
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapPage;
