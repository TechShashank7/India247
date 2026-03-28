import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, AlertTriangle, UserCircle, Star, CheckCircle2, Circle, Clock, Check } from 'lucide-react';
import ImageModal from '../components/ImageModal';

const TrackerPage = () => {
  const [complaintId, setComplaintId] = useState("");
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reason, setReason] = useState("");
  const [image, setImage] = useState(null);
  const [reopenError, setReopenError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [performance, setPerformance] = useState(null);
  const location = useLocation();

  const fetchComplaint = async (manualId = null) => {
    const idToFetch = (manualId || complaintId || "").trim();
    if (!idToFetch) return;

    try {
      setLoading(true);
      setError("");
      setComplaint(null); // Clear previous results

      const res = await fetch(`/api/complaints/${idToFetch.trim()}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Complaint not found. Please check the ID.");
        return;
      }

      setComplaint(data);
    } catch (err) {
      console.error("Error fetching complaint:", err);
      setError("Network error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (location.state?.complaintId) {
      const id = location.state.complaintId;
      setComplaintId(id);
      fetchComplaint(id);
    }
  }, [location.state]);

  useEffect(() => {
    if (complaint?.assignedOfficer?.name) {
      const officerName = encodeURIComponent(complaint.assignedOfficer.name);
      fetch(`/api/complaints/officer/performance/${officerName}`)
        .then(res => res.json())
        .then(data => setPerformance(data))
        .catch(err => console.error("Performance error:", err));
    }
  }, [complaint]);

  const handleReopen = async () => {
    setReopenError("");
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("reason", reason);
      if (image) {
        formData.append("image", image);
      }

      const res = await fetch(`/api/complaints/${complaint._id}/reopen`, {
        method: "POST",
        body: formData
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setReopenError(data?.error || "Failed to reopen complaint");
        setIsSubmitting(false);
        return;
      }

      setShowReopenModal(false);
      setReason("");
      setImage(null);
      fetchComplaint();
    } catch (err) {
      console.error(err);
      setReopenError("Network error. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSteps = (complaintObj) => {
    const stages = [
      "Complaint Filed",
      "Sent to Department",
      "Under Inspection",
      "Work Started",
      "Resolved"
    ];

    // Fallback for legacy data or missing stage:
    let currentStage = complaintObj.stage;
    if (!currentStage || !stages.includes(currentStage)) {
      if (complaintObj.status === "Resolved") currentStage = "Resolved";
      else if (complaintObj.status === "In Progress") currentStage = "Sent to Department";
      else currentStage = "Complaint Filed";
    }

    const currentStageIndex = stages.indexOf(currentStage);
    const isActuallyResolved = complaintObj.status === "Resolved";

    return stages.map((stageName, index) => {
      let status = "upcoming";
      
      if (isActuallyResolved) {
        status = "completed";
      } else {
        if (index < currentStageIndex) status = "completed";
        else if (index === currentStageIndex) status = "current";
      }

      let timeString = "";

      if (status === "completed" || (status === "current" && isActuallyResolved)) {
        const entry = complaintObj.timeline?.find(t => t.stage === stageName);
        if (entry) {
          timeString = new Date(entry.time).toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit"
          });
        } else if (index === 0 && complaintObj.createdAt) {
          timeString = new Date(complaintObj.createdAt).toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit"
          });
        }
      } else if (status === "current") {
        timeString = "In progress...";
      }

      return {
        label: stageName,
        time: timeString,
        status
      };
    });
  };

  const isEscalated = () => {
    if (!complaint?.createdAt) return false;
    const createdTime = new Date(complaint.createdAt).getTime();
    const currentTime = new Date().getTime();
    const diffInHours = (currentTime - createdTime) / (1000 * 60 * 60);
    return diffInHours >= 24 && complaint.status !== "Resolved";
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-8 border border-gray-100">
          <h1 className="text-2xl font-bold text-navy mb-4 text-center">Track Your Complaint</h1>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              fetchComplaint();
            }} 
            className="flex gap-3 max-w-xl mx-auto"
          >
            <div className="relative flex-1">
              <input 
                type="text" 
                value={complaintId}
                onChange={(e) => setComplaintId(e.target.value)}
                placeholder="Enter Tracking ID (e.g. IND-2026-12345)" 
                className="w-full pl-12 pr-4 py-3 border-[1.5px] border-gray-200 rounded-xl focus:border-saffron outline-none text-navy font-semibold focus:ring-1 focus:ring-saffron transition-all uppercase"
              />
              <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
            </div>
            <button type="submit" className="btn-primary flex items-center gap-2">
              {loading ? "Loading..." : "Track"}
            </button>
          </form>
          {loading && <p className="text-center mt-4 text-gray-500">Fetching complaint details...</p>}
          {error && <p className="text-center mt-4 text-red-500 font-medium bg-red-50 py-2 rounded-lg border border-red-100">{error}</p>}
        </div>

        {/* Tracker Result */}
        {complaint ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 flex flex-col md:flex-row justify-between items-start gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="bg-orange-100 text-saffron px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider">{complaint.category}</span>
                </div>
                <h2 className="text-xl font-bold text-navy mb-1">{complaint.title}</h2>
                <p className="text-gray-500 text-sm">📍 {complaint.location}</p>
              </div>
              <div className="text-right">
                <div className="inline-block bg-purple-100 text-purple-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-2">
                  Status: {complaint.status}
                </div>
                <p className="text-xs text-gray-400">Filed on {new Date(complaint.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Escalation Warning */}
            {isEscalated() && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-4">
                <AlertTriangle className="text-saffron shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-orange-800">Escalated to L2 Officer</h4>
                  <p className="text-orange-700 text-sm">
                    This complaint was automatically escalated because L1 action was delayed by 24 hours.
                  </p>
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-3 gap-6">
              
              {/* Main Progress Container */}
              <div className="md:col-span-2 bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                <div className="flex flex-col md:flex-row gap-8">
                  
                  {/* Timeline section */}
                  <div className="flex-1 order-2 md:order-1">
                    <h3 className="text-lg font-bold text-navy mb-8 flex items-center gap-2">
                       Live Progress 
                       {complaint.status === 'Resolved' && <span className="text-[10px] bg-green-100 text-india-green px-2 py-0.5 rounded-full animate-bounce">Completed</span>}
                    </h3>
                    
                    <div className="relative space-y-0">
                      {/* Dynamic Background Line */}
                      <div className="absolute left-[15px] top-2 bottom-8 w-[2px] bg-gray-100"></div>
                      
                      {/* Active Progress Line */}
                      <div 
                        className="absolute left-[15px] top-2 w-[2px] bg-india-green transition-all duration-1000 ease-out"
                        style={{ 
                          height: complaint.status === 'Resolved' 
                            ? 'calc(100% - 32px)' 
                            : `${(getSteps(complaint).filter(s => s.status === 'completed').length / (getSteps(complaint).length - 1)) * 90}%`
                        }}
                      ></div>
                      
                      <div className="space-y-8">
                        {getSteps(complaint).map((step, idx) => (
                          <div key={idx} className="flex gap-6 items-start relative z-10 group">
                            {/* Icon Circle */}
                            <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                              step.status === 'completed' ? 'bg-india-green border-india-green text-white shadow-lg shadow-green-100' :
                              step.status === 'current' ? 'bg-white border-saffron text-saffron scale-110 shadow-xl shadow-orange-100 ring-4 ring-orange-50' :
                              'bg-white border-gray-200 text-gray-300'
                            }`}>
                              {step.status === 'completed' ? (
                                <Check size={18} strokeWidth={3} className="animate-in zoom-in duration-300" />
                              ) : step.status === 'current' ? (
                                <Clock size={16} className="animate-spin-slow" />
                              ) : (
                                <div className="w-2 h-2 rounded-full bg-current"></div>
                              )}
                            </div>
                            
                            {/* Text Content */}
                            <div className={`transition-all duration-300 ${step.status === 'upcoming' ? 'opacity-40 grayscale' : 'opacity-100'}`}>
                              <h4 className={`font-bold text-sm md:text-base border-b-2 border-transparent transition-all ${
                                step.status === 'current' ? 'text-saffron' : 
                                step.status === 'completed' ? 'text-navy' : 'text-gray-400'
                              }`}>
                                {step.label}
                                {step.status === 'current' && <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-saffron animate-pulse"></span>}
                              </h4>
                              {step.time && <p className="text-[10px] md:text-xs font-bold text-gray-400 mt-0.5 uppercase tracking-tighter">{step.time}</p>}
                              {step.status === 'current' && (
                                <p className="text-xs text-saffron/80 font-semibold mt-1 italic animate-pulse">
                                  Our team is currently at this stage
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Complaint Image */}
                  {complaint.imageUrl && (
                    <div className="md:w-72 order-1 md:order-2 shrink-0">
                      <div 
                        className="relative group cursor-pointer overflow-hidden rounded-xl border-2 border-gray-100"
                        onClick={() => {
                          setSelectedImage(complaint.imageUrl);
                          setIsModalOpen(true);
                        }}
                      >
                        <img 
                          src={complaint.imageUrl} 
                          alt="Complaint" 
                          className="w-full h-[220px] object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="bg-white/90 text-navy text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">Click to view</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar Info */}
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Assigned Officer</h3>
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-2xl mb-3">
                      <UserCircle size={40} className="text-blue-500" />
                    </div>
                    <h4 className="font-bold text-navy">{complaint.assignedOfficer?.name || "Officer Sharma"}</h4>
                    <p className="text-xs text-gray-500 mb-2">{complaint.assignedOfficer?.department || "Civil Department"}</p>
                    
                    <div className="flex items-center gap-1 text-accent-gold mb-3">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          size={14} 
                          className={performance?.avgRating >= star ? "fill-current text-accent-gold" : "text-gray-200"} 
                        />
                      ))}
                      <span className="text-xs text-gray-600 font-semibold ml-1">{performance?.avgRating || 0}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 w-full mt-2 border-t border-gray-100 pt-4">
                      <div>
                        <p className="text-xs text-gray-400">Resolution Rate</p>
                        <p className="font-bold text-india-green">{performance?.completionRate || 0}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Avg Time</p>
                        <p className="font-bold text-navy">{performance?.avgTime || 0} hrs</p>
                      </div>
                    </div>
                  </div>
                </div>

                {complaint.status === "Resolved" && !complaint.rating?.given && (
                  <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 text-center">
                    <p className="text-sm font-bold text-navy mb-3">Rate the officer</p>
                    <div className="flex justify-center gap-2 mb-4">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          onClick={() => setRating(star)}
                          className={`cursor-pointer text-2xl transition-all ${rating >= star ? "text-yellow-400 scale-110" : "text-gray-300"}`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.preventDefault();
                        if (rating === 0) return;
                        
                        try {
                          console.log("Submitting rating:", rating, "for:", complaint._id);
                          const res = await fetch(`/api/complaints/${complaint._id}/rate`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ value: rating })
                          });
                          
                          const data = await res.json();
                          
                          if (!res.ok) {
                            console.error(data.error || "Failed to submit rating.");
                            return;
                          }
                          
                          console.log("Rating submitted successfully");
                          setRating(0); // Reset picker
                          await fetchComplaint(); // Re-fetch to update UI
                        } catch (err) {
                          console.error("Rating Error:", err);
                        }
                      }}
                      className="w-full py-2 bg-saffron text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-100 hover:bg-orange-600 transition-colors"
                    >
                      Submit Rating
                    </button>
                  </div>
                )}

                {complaint?.status === "Resolved" && (
                  <div className="bg-gray-100 rounded-2xl p-6 text-center">
                    {complaint.reopen?.count >= 1 ? (
                      <p className="text-sm text-orange-600 mb-4 font-medium">You can reopen a complaint only once.</p>
                    ) : (
                      <>
                        <p className="text-sm text-gray-600 mb-4 font-medium">Issue marked resolved but not fixed?</p>
                        <button 
                          onClick={() => setShowReopenModal(true)}
                          className="btn-outline w-full py-2 bg-white text-saffron border-saffron"
                        >
                          Reopen Complaint
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>
        ) : (
          /* ... unchanged ... */
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Search size={64} className="mb-4 text-gray-200 opacity-50" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No Tracking Info</h3>
            <p className="text-sm">Enter a valid Complaint ID to view its live status</p>
          </div>
        )}
      </div>

      {showReopenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-navy mb-4">Reopen Complaint</h3>
            <p className="text-sm text-gray-500 mb-4">
              Please let us know why you are not satisfied with the resolution.
            </p>
            
            <textarea 
              className="w-full p-3 border border-gray-200 rounded-xl mb-4 focus:border-saffron focus:ring-1 focus:ring-saffron outline-none resize-none h-24 text-sm"
              placeholder="Explain the reason for reopening... (Minimum 10 characters)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            ></textarea>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Attach Photo (Optional)</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => {
                  if(e.target.files && e.target.files[0]) {
                    setImage(e.target.files[0]);
                  }
                }}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-saffron hover:file:bg-orange-100"
              />
            </div>

            {reopenError && (
              <p className="text-red-500 text-sm mb-4">{reopenError}</p>
            )}

            <div className="flex gap-3 justify-end mt-6">
              <button 
                onClick={() => {
                  setShowReopenModal(false);
                  setReason("");
                  setImage(null);
                  setReopenError("");
                }}
                className="px-4 py-2 rounded-xl text-gray-500 hover:bg-gray-100 font-medium transition-colors text-sm"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                onClick={handleReopen}
                disabled={isSubmitting}
                className="btn-primary py-2 px-4 text-sm"
              >
                {isSubmitting ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ImageModal 
        isOpen={isModalOpen} 
        imageUrl={selectedImage} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
};

export default TrackerPage;
