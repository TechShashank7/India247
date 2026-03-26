import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

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
  const [filter, setFilter] = useState('All');
  
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [mapReady, setMapReady] = useState(false);
  
  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/complaints');
        setComplaints(res.data);
      } catch (err) {
        console.error('Error fetching complaints:', err);
      }
    };
    fetchComplaints();
  }, []);

  const filteredComplaints = filter === 'All' 
    ? complaints 
    : complaints.filter(c => c.status === filter);

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

    // Clear existing markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    const infoWindow = new window.google.maps.InfoWindow();

    filteredComplaints.filter(c => c.lat && c.lng).forEach(complaint => {
      const color = getMarkerColor(complaint.status);
      const markerColorName = color === 'violet' ? 'purple' : color === 'grey' ? 'red' : color;
      
      const marker = new window.google.maps.Marker({
        position: { lat: parseFloat(complaint.lat), lng: parseFloat(complaint.lng) },
        map: mapInstanceRef.current,
        icon: `http://maps.google.com/mapfiles/ms/icons/${markerColorName}-dot.png`,
      });

      marker.addListener("click", () => {
        const isResolved = complaint.status === 'Resolved';
        const isInProgress = complaint.status === 'In Progress';
        const bgColors = isResolved ? '#dcfce7' : isInProgress ? '#ffedd5' : '#fee2e2';
        const textColors = isResolved ? '#15803d' : isInProgress ? '#c2410c' : '#b91c1c';

        infoWindow.setContent(`
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
              <span style="font-size: 12px; font-weight: 700; color: #9ca3af;">
                ${complaint.upvotes || 0} ⭐
              </span>
            </div>
            <button style="width: 100%; margin-top: 12px; background-color: #111827; color: white; font-size: 12px; font-weight: 600; padding: 8px; border-radius: 4px; border: none; cursor: pointer;">
              View Details
            </button>
          </div>
        `);
        infoWindow.open(mapInstanceRef.current, marker);
      });

      markersRef.current.push(marker);
    });
  }, [filteredComplaints, mapReady]);

  return (
    <div className="pt-16 min-h-screen bg-gray-50 flex flex-col">
      {/* Filters & Stats Bar */}
      <div className="bg-white border-b border-gray-100 shadow-sm z-10 p-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex overflow-x-auto gap-2 w-full md:w-auto pb-2 md:pb-0 hide-scrollbar">
            {['All', 'Pending', 'In Progress', 'Resolved'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                  filter === f 
                    ? 'bg-navy text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f}
              </button>
            ))}
            <select className="px-4 py-2 rounded-full text-sm font-semibold bg-gray-100 text-gray-600 outline-none hover:bg-gray-200 cursor-pointer">
              <option>Category</option>
              <option>Roads</option>
              <option>Water</option>
              <option>Garbage</option>
            </select>
          </div>
          
          <div className="flex gap-4 text-sm font-medium">
            <div className="px-3 py-1 bg-orange-50 text-saffron rounded-lg">
              Total shown: {filteredComplaints.length}
            </div>
            <div className="px-3 py-1 bg-red-50 text-red-600 rounded-lg hidden sm:block">
              Oldest pending: 3 days
            </div>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 w-full bg-gray-200 relative z-0">
        <div ref={mapRef} style={{ height: '65vh', width: '100%' }} />
      </div>
      
      {/* Bottom Stats Cards - Desktop */}
      <div className="absolute bottom-6 left-6 right-6 hidden md:grid grid-cols-3 gap-6 max-w-7xl mx-auto z-[400] pointer-events-none">
        <div className="bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-gray-100 pointer-events-auto">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Total in view</p>
          <p className="text-3xl font-black text-navy">{filteredComplaints.length}</p>
        </div>
        <div className="bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-red-100 pointer-events-auto">
          <p className="text-xs font-bold text-red-500 uppercase tracking-widest mb-1">Oldest Pending</p>
          <p className="text-lg font-bold text-red-700 leading-tight">Garbage pile uncollected<br/><span className="text-sm font-medium opacity-80">Karol Bagh • 4 days seq</span></p>
        </div>
        <div className="bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-orange-100 pointer-events-auto">
          <p className="text-xs font-bold text-saffron uppercase tracking-widest mb-1">Most Upvoted</p>
          <p className="text-lg font-bold text-gray-800 leading-tight">Open manhole<br/><span className="text-sm font-medium text-gray-500">Janakpuri • 210 upvotes</span></p>
        </div>
      </div>
    </div>
  );
};

export default MapPage;
