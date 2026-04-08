// TODO: Replace with Firebase authentication (Officer role-based access)
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Target, AlertTriangle, Clock, CheckCircle, Star } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import ImageModal from '../components/ImageModal';
import { useAuth } from '../context/AuthContext';

const OfficerDashboard = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [sortBy, setSortBy] = useState('Urgency');
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedReopen, setSelectedReopen] = useState(null);
  const [tick, setTick] = useState(0);
  const [performance, setPerformance] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getHoursPassed = (createdAt) => {
    return (Date.now() - new Date(createdAt)) / (1000 * 60 * 60);
  };

  const getEscalationLevel = (hours) => {
    return Math.min(4, Math.floor(hours / 12) + 1);
  };

  const getRemainingTime = (hours) => {
    const nextLevelTime = Math.ceil(hours / 12) * 12;
    const remainingHours = nextLevelTime - hours;

    const totalSeconds = Math.floor(remainingHours * 3600);

    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const scrollToComplaint = (id) => {
    const element = document.getElementById(`complaint-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };
  
  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await axios.get('https://api.india247.shashankraj.in/api/complaints');
      setComplaints(res.data);
    } catch (err) {
      console.error('Error fetching complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPerformance = async () => {
    try {
      const officerName = encodeURIComponent(user?.name || "Officer");
      const res = await fetch(`https://api.india247.shashankraj.in/api/complaints/officer/performance/${officerName}`);
      const data = await res.json();
      setPerformance(data);
    } catch (err) {
      console.error('Error fetching performance:', err);
    }
  };

  useEffect(() => {
    fetchComplaints();
    if (user?.name) {
      fetchPerformance();
    }
  }, [user?.name]);

  const updateStatus = async (id, action) => {
    let status = "";
    let stage = "";

    if (action === "Accept Issue" || action === "Sent to Department") {
      status = "In Progress";
      stage = "Sent to Department";
    } else if (action === "Under Inspection") {
      status = "In Progress";
      stage = "Under Inspection";
    } else if (action === "Work Started") {
      status = "In Progress";
      stage = "Work Started";
    } else if (action === "Mark Resolved") {
      status = "Resolved";
      stage = "Resolved";
    }

    setUpdatingId(id);
    try {
      await axios.put(`https://api.india247.shashankraj.in/api/complaints/${id}/status`, {
        status,
        stage
      });
      fetchComplaints(); // refresh after update
      fetchPerformance(); // refresh performance metrics
    } catch (err) {
      console.error("Error updating status:", err);
    } finally {
      setUpdatingId(null);
    }
  };


  const pending = complaints.filter(c => c.status === 'Pending').length;
  const inProgress = complaints.filter(c => c.status === 'In Progress').length;
  const resolved = complaints.filter(c => c.status === 'Resolved').length;

  const escalationCases = complaints.filter(c => {
    if (c.status === "Resolved") return false;

    // Use current time or createdAt if available to simulate hours passed if missing
    if (!c.createdAt) return false;

    const hours = getHoursPassed(c.createdAt);
    const level = getEscalationLevel(hours);

    // show if near escalation OR already escalated
    return hours >= 10 || level > 1;
  });

  const sortedComplaints = [...complaints].sort((a, b) => {
    if (sortBy === 'Newest First') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    } else if (sortBy === 'Oldest First') {
      return new Date(a.createdAt) - new Date(b.createdAt);
    } else {
      // Default to Urgency (by upvotes)
      return (b.upvotes || 0) - (a.upvotes || 0);
    }
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="pt-24 pb-12 min-h-screen bg-background">
      <div className="px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-navy flex items-center gap-2">{getGreeting()}, {user?.name || 'Officer'} 👋</h1>
            <p className="text-gray-500 flex items-center gap-2 font-medium mt-1">
              <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
              <span className="text-saffron">{user?.city || 'Your Jurisdiction'}</span>
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 border-l-4 border-red-500 shadow-sm flex items-center gap-4 hover:-translate-y-1 transition-transform">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500"><Target size={24} /></div>
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase">Pending</p>
              <p className="text-2xl font-black text-navy">{pending}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border-l-4 border-orange-400 shadow-sm flex items-center gap-4 hover:-translate-y-1 transition-transform">
            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-500"><Clock size={24} /></div>
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase">In Progress</p>
              <p className="text-2xl font-black text-navy">{inProgress}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border-l-4 border-india-green shadow-sm flex items-center gap-4 hover:-translate-y-1 transition-transform">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-india-green"><CheckCircle size={24} /></div>
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase">Resolved Today</p>
              <p className="text-2xl font-black text-navy">{resolved}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border-l-4 border-red-700 shadow-sm flex items-center gap-4 hover:-translate-y-1 transition-transform bg-red-50/30">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600"><AlertTriangle size={24} /></div>
            <div>
              <p className="text-sm font-bold text-red-700 uppercase">Escalated</p>
              <p className="text-2xl font-black text-red-900">{escalationCases.length}</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Main Table */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-navy">Priority Complaints</h3>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-sm font-semibold rounded-lg px-3 py-1 outline-none text-gray-600 cursor-pointer"
              >
                <option>Urgency</option>
                <option>Newest First</option>
                <option>Oldest First</option>
              </select>
            </div>
            
            <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin text-saffron w-8 h-8 border-4 border-current border-t-transparent rounded-full"></div>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 text-xs uppercase tracking-wider text-gray-500 font-bold">
                      <th className="p-4 border-b border-gray-100">ID</th>
                      <th className="p-4 border-b border-gray-100">Category</th>
                      <th className="p-4 border-b border-gray-100">Location</th>
                      <th className="px-4 py-2 border-b border-gray-100">Image</th>
                      <th className="p-4 border-b border-gray-100">Status</th>
                      <th className="p-4 border-b border-gray-100">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-gray-50">
                    {sortedComplaints.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-4 text-center text-gray-500 py-8">No complaints found.</td>
                      </tr>
                    ) : (
                      sortedComplaints.slice(0, 10).map((c) => (
                        <tr id={`complaint-${c._id || c.id}`} key={c._id || c.id} className="hover:bg-gray-50/80 transition-colors group">
                          <td className="p-4 font-mono font-bold text-navy truncate max-w-[100px]" title={c._id}>{String(c._id).slice(-6)}</td>
                          <td className="p-4 font-semibold text-gray-700">{c.category || 'Issue'}</td>
                          <td className="p-4 text-gray-500 truncate max-w-[150px]">{c.location}</td>
                          <td className="px-4 py-2">
                            {c.imageUrl ? (
                              <button
                                onClick={() => setSelectedImage(c.imageUrl)}
                                className="text-blue-600 hover:underline text-sm"
                              >
                                📷 View
                              </button>
                            ) : (
                              <span className="text-gray-400 text-sm">No Image</span>
                            )}
                          </td>
                          <td className="p-4 whitespace-nowrap"><StatusBadge status={c.status} /></td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              {c.status === 'Pending' ? (
                                <button 
                                  onClick={() => updateStatus(c._id, 'Accept Issue')} 
                                  disabled={updatingId === c._id}
                                  className="bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors disabled:opacity-50"
                                >
                                  {updatingId === c._id ? 'Updating...' : 'Accept Issue'}
                                </button>
                              ) : c.status !== 'Resolved' ? (
                                <select 
                                  onChange={(e) => updateStatus(c._id, e.target.value)}
                                  disabled={updatingId === c._id}
                                  className="bg-gray-100 text-gray-700 font-semibold px-2 py-1.5 rounded-lg text-xs outline-none border border-transparent focus:border-gray-300 cursor-pointer disabled:opacity-50"
                                  value={c.stage || "Update Status..."}
                                >
                                  <option disabled value="Update Status...">Update Status...</option>
                                  <option value="Sent to Department">Sent to Department</option>
                                  <option value="Under Inspection">Under Inspection</option>
                                  <option value="Work Started">Work Started</option>
                                  <option value="Mark Resolved">Mark Resolved</option>
                                </select>
                              ) : (
                                <span className="text-india-green font-bold text-xs bg-green-50 px-3 py-1.5 rounded-lg inline-block">Closed</span>
                              )}

                              {c.reopen?.isReopened && c.status !== "Resolved" && (
                                <div 
                                  className="relative ml-2 cursor-pointer flex-shrink-0"
                                  onClick={() => setSelectedReopen(c)}
                                  title="User reopened this complaint"
                                >
                                  <span className="absolute left-0 top-0 inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75 animate-ping"></span>
                                  <span className="relative inline-flex h-3 w-3 rounded-full bg-red-600"></span>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 text-center">
              <button className="font-semibold text-saffron text-sm hover:underline">View All {complaints.length} Assigned Complaints</button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Escalation Alert */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-red-100 flex flex-col max-h-[400px]">
              <h3 className="font-bold text-red-800 flex items-center gap-2 mb-4 shrink-0">
                <AlertTriangle size={20} className="text-red-500" />
                Escalation Warnings ({escalationCases.length})
              </h3>
              <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                {escalationCases.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No escalated complaints at the moment.</p>
                ) : (
                  escalationCases.map((c) => {
                    const hours = getHoursPassed(c.createdAt);
                    const level = getEscalationLevel(hours);
                    const remaining = getRemainingTime(hours);

                    return (
                      <div
                        key={c._id || c.id}
                        onClick={() => scrollToComplaint(c._id || c.id)}
                        className="cursor-pointer bg-red-50 border border-red-200 rounded-lg p-3 hover:shadow-md transition"
                      >
                        <p className="text-sm font-semibold text-red-600">
                          {c.title}
                        </p>

                        <p className="text-xs text-gray-600">
                          {c.location}
                        </p>

                        <p className="text-xs text-red-500 mt-1">
                          {level < 4
                            ? `Escalating to Level ${level + 1} in ${remaining}`
                            : `Max escalation reached (Level 4)`
                          }
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Performance */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-bold text-navy mb-5">Your Performance</h3>
              
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-gray-600">Completion Rate</span>
                    <span className="font-bold text-navy">{performance?.completionRate || 0}%</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-india-green rounded-full transition-all duration-1000" style={{ width: `${performance?.completionRate || 0}%` }}></div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Avg Resolution</p>
                    <p className="text-xl font-black text-navy">{performance?.avgTime || 0} hrs</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-gray-400 uppercase">Citizen Rating</p>
                    <div className="flex items-center gap-1 text-accent-gold justify-end">
                      <span className="text-lg font-black mr-1 text-navy">{performance?.avgRating || 0}</span>
                      <Star size={16} className="fill-current" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
      <ImageModal
        isOpen={!!selectedImage}
        imageUrl={selectedImage}
        onClose={() => setSelectedImage(null)}
      />

      {selectedReopen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-[320px] shadow-lg relative animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-semibold text-red-600 mb-3 flex items-center gap-2">
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600 shrink-0">
                <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping"></span>
              </span>
              Reopened by User
            </h3>
            
            <p className="text-sm text-gray-700 mb-4 whitespace-pre-wrap leading-relaxed">
              {selectedReopen.reopen.reason}
            </p>

            {selectedReopen.reopen.image && (
              <img
                src={selectedReopen.reopen.image}
                alt="Reopen Proof"
                className="w-full h-40 object-cover rounded-lg mb-4 border border-gray-100 shadow-sm"
              />
            )}

            <button
              onClick={() => setSelectedReopen(null)}
              className="w-full text-center text-sm text-gray-500 hover:text-navy hover:bg-gray-50 font-medium py-2 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfficerDashboard;
