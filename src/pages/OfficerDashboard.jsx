import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Camera, AlertCircle, CheckCircle, FileText, Upload, RefreshCw, BarChart2 } from 'lucide-react';

const OfficerDashboard = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Resolution Proof state
  const [resolutionNote, setResolutionNote] = useState("");
  const [resolutionFile, setResolutionFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const headers = { 'x-user-uid': user.uid };
      const [complaintsRes, metricsRes] = await Promise.all([
        axios.get('https://api.india247.shashankraj.in/api/officer/my-complaints', { headers }),
        axios.get('https://api.india247.shashankraj.in/api/officer/my-metrics', { headers })
      ]);
      setComplaints(complaintsRes.data);
      setMetrics(metricsRes.data);
    } catch (err) {
      console.error("Error fetching officer data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.uid) {
      fetchDashboardData();
    }
  }, [user]);

  const updateProgress = async (id, status) => {
    try {
      const headers = { 'x-user-uid': user.uid };
      await axios.put(`https://api.india247.shashankraj.in/api/officer/complaints/${id}/progress`, {
        status,
        stage: status
      }, { headers });
      fetchDashboardData();
      if (selectedComplaint?._id === id) {
        setSelectedComplaint(prev => ({ ...prev, status }));
      }
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const submitResolution = async (e) => {
    e.preventDefault();
    if (!resolutionNote || !resolutionFile) return alert("Both note and image are required!");
    
    setUploading(true);
    const formData = new FormData();
    formData.append("resolutionNote", resolutionNote);
    formData.append("resolutionImage", resolutionFile);

    try {
      const headers = { 'x-user-uid': user.uid, 'Content-Type': 'multipart/form-data' };
      await axios.put(`https://api.india247.shashankraj.in/api/officer/complaints/${selectedComplaint._id}/resolve`, formData, { headers });
      setResolutionNote("");
      setResolutionFile(null);
      fetchDashboardData();
      setSelectedComplaint(null);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to submit resolution");
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="pt-24 text-center">Loading Officer Dashboard...</div>;

  const reopenedComplaints = complaints.filter(c => c.reopen?.isReopened && c.status !== "Resolved");
  const activeComplaints = complaints.filter(c => !c.reopen?.isReopened && c.status !== "Resolved");
  const resolvedComplaints = complaints.filter(c => c.status === "Resolved");

  return (
    <div className="pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-navy mb-2">Officer Dashboard</h1>
          <p className="text-gray-500">Manage your assigned complaints and workload.</p>
        </div>
      </div>

      {/* Metrics Row */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
            <p className="text-xs font-bold text-gray-500 uppercase">Current Load</p>
            <p className="text-3xl font-bold text-saffron mt-1">{metrics.currentLoad}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
            <p className="text-xs font-bold text-gray-500 uppercase">Resolved</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{metrics.resolvedComplaints}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
            <p className="text-xs font-bold text-gray-500 uppercase">Reopened</p>
            <p className="text-3xl font-bold text-red-600 mt-1">{metrics.reopenedComplaints}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
            <p className="text-xs font-bold text-gray-500 uppercase">Trust Score</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">{metrics.trustScore}/100</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center col-span-2 md:col-span-1">
            <p className="text-xs font-bold text-gray-500 uppercase">Citizen Rating</p>
            <p className="text-3xl font-bold text-accent-gold mt-1">★ {metrics.citizenRating}</p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Left Col: Lists */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Reopen Queue */}
          {reopenedComplaints.length > 0 && (
            <div className="bg-red-50 rounded-2xl border border-red-100 p-5 shadow-sm">
              <h3 className="font-bold text-red-700 flex items-center gap-2 mb-4">
                <RefreshCw size={18} /> Reopened Queue ({reopenedComplaints.length})
              </h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {reopenedComplaints.map(c => (
                  <div key={c._id} onClick={() => setSelectedComplaint(c)} className={`p-3 rounded-xl border cursor-pointer transition-colors ${selectedComplaint?._id === c._id ? 'bg-white border-red-300 shadow-sm' : 'bg-white/60 border-transparent hover:bg-white'}`}>
                    <p className="text-xs font-bold text-red-600 mb-1">{c.trackingId}</p>
                    <p className="font-semibold text-navy text-sm line-clamp-1">{c.title}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Assigned */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-bold text-navy flex items-center gap-2 mb-4">
              <FileText size={18} className="text-saffron" /> My Assigned Complaints
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {activeComplaints.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No active complaints.</p>
              ) : (
                activeComplaints.map(c => (
                  <div key={c._id} onClick={() => setSelectedComplaint(c)} className={`p-3 rounded-xl border cursor-pointer transition-colors ${selectedComplaint?._id === c._id ? 'border-saffron bg-orange-50/50 shadow-sm' : 'border-gray-100 hover:border-orange-200'}`}>
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-xs font-bold text-gray-400">{c.trackingId}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.status === 'Pending' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                        {c.status}
                      </span>
                    </div>
                    <p className="font-semibold text-navy text-sm line-clamp-1">{c.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{c.location}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Details */}
        <div className="lg:col-span-2">
          {selectedComplaint ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-xs font-bold text-saffron uppercase tracking-wider">{selectedComplaint.trackingId}</span>
                    <h2 className="text-xl font-bold text-navy mt-1">{selectedComplaint.title}</h2>
                  </div>
                  <span className={`text-sm font-bold px-3 py-1 rounded-full ${selectedComplaint.status === 'Resolved' ? 'bg-green-100 text-green-700' : selectedComplaint.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                    {selectedComplaint.status}
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-6">
                  <span className="bg-gray-50 px-3 py-1 rounded-lg">Category: <span className="font-semibold text-gray-800">{selectedComplaint.category}</span></span>
                  <span className="bg-gray-50 px-3 py-1 rounded-lg">Region: <span className="font-semibold text-gray-800">{selectedComplaint.region}</span></span>
                  <span className="bg-gray-50 px-3 py-1 rounded-lg">Citizen: <span className="font-semibold text-gray-800">{selectedComplaint.user?.name || 'Anonymous'}</span></span>
                </div>

                <div className="prose prose-sm max-w-none text-gray-700 mb-6">
                  <p>{selectedComplaint.description}</p>
                </div>

                {selectedComplaint.imageUrl && (
                  <div className="mb-6">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">Original Image</p>
                    <img src={selectedComplaint.imageUrl} alt="Complaint" className="max-h-64 rounded-xl border border-gray-200" />
                  </div>
                )}

                {/* Reopen Info if applicable */}
                {selectedComplaint.reopen?.isReopened && (
                  <div className="bg-red-50 p-4 rounded-xl border border-red-100 mb-6">
                    <h4 className="font-bold text-red-700 flex items-center gap-2 mb-2"><AlertCircle size={16} /> Reopen Request</h4>
                    <p className="text-sm text-red-900 mb-3"><span className="font-semibold">Reason:</span> {selectedComplaint.reopen.reason}</p>
                    {selectedComplaint.reopen.image && (
                      <img src={selectedComplaint.reopen.image} alt="Reopen" className="max-h-48 rounded-lg border border-red-200" />
                    )}
                  </div>
                )}
              </div>

              {/* Action Area */}
              <div className="p-6 bg-gray-50">
                {selectedComplaint.status === 'Pending' && (
                  <button onClick={() => updateProgress(selectedComplaint._id, 'In Progress')} className="btn-primary w-full py-3">
                    Mark as In Progress
                  </button>
                )}

                {selectedComplaint.status === 'In Progress' && (
                  <form onSubmit={submitResolution} className="space-y-4 bg-white p-5 rounded-xl border border-gray-200">
                    <h4 className="font-bold text-navy flex items-center gap-2 mb-2"><CheckCircle size={18} className="text-india-green" /> Submit Resolution Proof</h4>
                    <p className="text-xs text-gray-500 mb-4">You must provide evidence to close this complaint. This is monitored for quality assurance.</p>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Resolution Note</label>
                      <textarea required value={resolutionNote} onChange={e => setResolutionNote(e.target.value)} className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:ring-saffron focus:border-saffron" rows="3" placeholder="Explain the action taken..."></textarea>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Resolution Image (Required)</label>
                      <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload size={24} className="text-gray-400 mb-2" />
                            <p className="text-sm text-gray-500">{resolutionFile ? resolutionFile.name : "Click to upload proof image"}</p>
                          </div>
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => setResolutionFile(e.target.files[0])} />
                        </label>
                      </div>
                    </div>

                    <button type="submit" disabled={uploading} className="btn-primary w-full py-3 mt-2">
                      {uploading ? 'Uploading Proof...' : 'Resolve Complaint'}
                    </button>
                  </form>
                )}

                {selectedComplaint.status === 'Resolved' && (
                  <div className="bg-green-50 text-green-800 p-4 rounded-xl border border-green-200 flex items-start gap-3">
                    <CheckCircle size={20} className="text-green-600 mt-0.5" />
                    <div>
                      <p className="font-bold mb-1">Complaint Resolved</p>
                      <p className="text-sm">You have successfully provided proof and resolved this issue.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-300 h-96 flex flex-col items-center justify-center text-gray-400">
              <BarChart2 size={48} className="mb-4 opacity-50" />
              <p>Select a complaint to view details and update progress</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OfficerDashboard;
