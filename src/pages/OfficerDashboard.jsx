import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Target, AlertTriangle, Clock, CheckCircle, Star } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';

const OfficerDashboard = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/complaints');
      setComplaints(res.data);
    } catch (err) {
      console.error('Error fetching complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) fetchComplaints();
  }, [isLoggedIn]);

  const updateStatus = async (id, newStatus) => {
    if (newStatus.includes('Update Status')) return;
    const cleanStatus = newStatus.replace(' ✅', '').replace('Mark Resolved', 'Resolved').trim();
    
    let submitStatus = cleanStatus;
    if (cleanStatus === 'Accept Issue') {
      submitStatus = 'Assigned';
    }
    
    try {
      await axios.put(`http://localhost:5000/api/complaints/${id}/status`, { status: submitStatus });
      fetchComplaints();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-saffron rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
              I247
            </div>
            <h2 className="text-2xl font-bold text-navy">Officer Portal</h2>
            <p className="text-gray-500 text-sm mt-1">For authorized government personnel only</p>
          </div>
          
          <form onSubmit={(e) => { e.preventDefault(); setIsLoggedIn(true); }} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Officer ID</label>
              <input type="text" placeholder="e.g. OFF-101" className="w-full input-field bg-gray-50 focus:bg-white uppercase font-mono" defaultValue="OFF-101" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
              <input type="password" placeholder="••••••••" className="w-full input-field bg-gray-50 focus:bg-white" defaultValue="password" required />
            </div>
            <button type="submit" className="w-full bg-navy text-white rounded-xl py-3 font-bold mt-6 hover:bg-gray-800 transition-colors">
              Login as Officer
            </button>
          </form>
        </div>
      </div>
    );
  }

  const pending = complaints.filter(c => c.status === 'Pending').length;
  const inProgress = complaints.filter(c => c.status === 'In Progress' || c.status === 'Under Inspection' || c.status === 'Assigned').length;
  const resolved = complaints.filter(c => c.status === 'Resolved').length;

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-navy flex items-center gap-2">Good morning, Officer Sharma 👋</h1>
            <p className="text-gray-500 flex items-center gap-2 font-medium mt-1">
              <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
              <span className="text-saffron">North Delhi — Ward 14</span>
            </p>
          </div>
          <button onClick={() => setIsLoggedIn(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-white transition-colors">
            Logout
          </button>
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
              <p className="text-2xl font-black text-red-900">2</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Main Table */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-navy">Priority Complaints</h3>
              <select className="bg-gray-50 border border-gray-200 text-sm font-semibold rounded-lg px-3 py-1 outline-none text-gray-600">
                <option>Sort by: Urgency</option>
                <option>Newest First</option>
                <option>Oldest First</option>
              </select>
            </div>
            
            <div className="overflow-x-auto">
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
                      <th className="p-4 border-b border-gray-100">Status</th>
                      <th className="p-4 border-b border-gray-100">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-gray-50">
                    {complaints.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-4 text-center text-gray-500 py-8">No complaints found.</td>
                      </tr>
                    ) : (
                      complaints.slice(0, 10).map((c) => (
                        <tr key={c._id || c.id} className="hover:bg-gray-50/80 transition-colors group">
                          <td className="p-4 font-mono font-bold text-navy truncate max-w-[100px]" title={c._id}>{String(c._id).slice(-6)}</td>
                          <td className="p-4 font-semibold text-gray-700">{c.category || 'Issue'}</td>
                          <td className="p-4 text-gray-500 truncate max-w-[150px]">{c.location}</td>
                          <td className="p-4 whitespace-nowrap"><StatusBadge status={c.status} /></td>
                          <td className="p-4">
                            {c.status === 'Pending' ? (
                              <button onClick={() => updateStatus(c._id, 'Accept Issue')} className="bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors">
                                Accept Issue
                              </button>
                            ) : c.status !== 'Resolved' ? (
                              <select 
                                onChange={(e) => updateStatus(c._id, e.target.value)}
                                className="bg-gray-100 text-gray-700 font-semibold px-2 py-1.5 rounded-lg text-xs outline-none border border-transparent focus:border-gray-300 cursor-pointer"
                                defaultValue="Update Status..."
                              >
                                <option disabled>Update Status...</option>
                                <option>Assigned</option>
                                <option>Under Inspection</option>
                                <option>Mark Resolved ✅</option>
                              </select>
                            ) : (
                              <span className="text-india-green font-bold text-xs bg-green-50 px-3 py-1.5 rounded-lg inline-block">Closed</span>
                            )}
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
            <div className="bg-red-50 rounded-2xl p-6 border border-red-100">
              <h3 className="font-bold text-red-800 flex items-center gap-2 mb-4">
                <AlertTriangle size={20} className="text-red-500" />
                L2 Escalation Warning
              </h3>
              <div className="space-y-3">
                <div className="bg-white rounded-xl p-3 shadow-sm border border-red-100">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-bold text-red-600">Garbage • Karol Bagh</span>
                    <span className="text-xs font-bold font-mono text-gray-400">#IND-04822</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 line-clamp-1">Garbage pile uncollected</p>
                  <p className="text-xs text-red-500 font-medium mt-2">Requires immediate action. Escalating to Zonal Officer in 2 hours.</p>
                </div>
              </div>
            </div>

            {/* Performance */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-bold text-navy mb-5">Your Performance</h3>
              
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-gray-600">Completion Rate</span>
                    <span className="font-bold text-navy">87%</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-india-green rounded-full w-[87%]"></div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Avg Resolution</p>
                    <p className="text-xl font-black text-navy">18 hrs</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-gray-400 uppercase">Citizen Rating</p>
                    <div className="flex items-center gap-1 text-accent-gold justify-end">
                      <span className="text-lg font-black mr-1 text-navy">4.2</span>
                      <Star size={16} className="fill-current" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};

export default OfficerDashboard;
