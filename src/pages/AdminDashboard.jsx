import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Users, AlertTriangle, Activity, Briefcase, ChevronRight, UserX, UserCheck } from 'lucide-react';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [officers, setOfficers] = useState([]);
  const [slaFlags, setSlaFlags] = useState([]);
  const [deptAnalytics, setDeptAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    try {
      const headers = { 'x-user-uid': user.uid };
      const [overviewRes, officersRes, slaRes, deptRes] = await Promise.all([
        axios.get('https://api.india247.shashankraj.in/api/admin/overview', { headers }),
        axios.get('https://api.india247.shashankraj.in/api/admin/officers', { headers }),
        axios.get('https://api.india247.shashankraj.in/api/admin/sla-monitor', { headers }),
        axios.get('https://api.india247.shashankraj.in/api/admin/department-analytics', { headers })
      ]);
      setOverview(overviewRes.data);
      setOfficers(officersRes.data);
      setSlaFlags(slaRes.data);
      setDeptAnalytics(deptRes.data);
    } catch (err) {
      console.error("Failed to fetch admin data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.uid) fetchAdminData();
  }, [user]);

  const toggleOfficerActive = async (id) => {
    try {
      const headers = { 'x-user-uid': user.uid };
      await axios.put(`https://api.india247.shashankraj.in/api/admin/officers/${id}/toggle-active`, {}, { headers });
      fetchAdminData();
    } catch (err) {
      alert("Failed to toggle officer status");
    }
  };

  const reassignComplaint = async (complaintId, newOfficerId) => {
    if (!newOfficerId) return;
    try {
      const headers = { 'x-user-uid': user.uid };
      await axios.put(`https://api.india247.shashankraj.in/api/admin/complaints/${complaintId}/reassign`, { newOfficerId }, { headers });
      alert("Successfully reassigned!");
      fetchAdminData();
    } catch (err) {
      alert("Failed to reassign complaint");
    }
  };

  if (loading) return <div className="pt-24 text-center">Loading Admin Dashboard...</div>;

  return (
    <div className="pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy mb-2">Admin Dashboard</h1>
        <p className="text-gray-500">Platform oversight, SLA monitoring, and officer management.</p>
      </div>

      {/* Overview Stats */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <p className="text-xs font-bold text-gray-500 uppercase">Total</p>
            <p className="text-3xl font-bold text-navy mt-1">{overview.totalComplaints}</p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <p className="text-xs font-bold text-gray-500 uppercase">Pending</p>
            <p className="text-3xl font-bold text-orange-600 mt-1">{overview.pending}</p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <p className="text-xs font-bold text-gray-500 uppercase">In Progress</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">{overview.inProgress}</p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <p className="text-xs font-bold text-gray-500 uppercase">Resolved</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{overview.resolved}</p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <p className="text-xs font-bold text-gray-500 uppercase">Reopened</p>
            <p className="text-3xl font-bold text-red-600 mt-1">{overview.reopened}</p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* SLA Monitor */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col h-96">
          <h3 className="font-bold text-navy flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-red-500" /> SLA Monitor (Overdue)
          </h3>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {slaFlags.length === 0 ? (
              <p className="text-sm text-gray-500 text-center mt-10">No complaints currently violating SLA.</p>
            ) : (
              slaFlags.map(flag => (
                <div key={flag.complaintId} className="p-4 bg-red-50 rounded-xl border border-red-100 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <p className="font-bold text-red-800 text-sm">{flag.trackingId}</p>
                    <span className="bg-red-200 text-red-800 text-xs font-bold px-2 py-1 rounded-md">{flag.hoursOverdue}h OVERDUE</span>
                  </div>
                  <p className="text-sm text-navy font-medium line-clamp-1">{flag.title}</p>
                  <p className="text-xs text-gray-600">Officer: {flag.officerName} | Dept: {flag.departmentName}</p>
                  
                  {/* Quick Reassign UI */}
                  <div className="mt-2 pt-2 border-t border-red-200 flex gap-2">
                    <select id={`reassign-${flag.complaintId}`} className="text-xs p-1.5 rounded-md border border-gray-300 flex-1">
                      <option value="">Reassign to...</option>
                      {officers.filter(o => o.isActive && o.departmentId?.name === flag.departmentName).map(o => (
                        <option key={o._id} value={o._id}>{o.name} (Load: {o.currentLoad})</option>
                      ))}
                    </select>
                    <button 
                      onClick={() => reassignComplaint(flag.complaintId, document.getElementById(`reassign-${flag.complaintId}`).value)}
                      className="bg-navy text-white text-xs px-3 py-1.5 rounded-md font-semibold hover:bg-gray-800"
                    >
                      Go
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Department Analytics */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col h-96">
          <h3 className="font-bold text-navy flex items-center gap-2 mb-4">
            <Activity size={18} className="text-blue-500" /> Department Analytics
          </h3>
          <div className="flex-1 overflow-y-auto pr-2">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 sticky top-0">
                <tr>
                  <th className="p-3 font-semibold rounded-tl-lg">Department</th>
                  <th className="p-3 font-semibold">Total</th>
                  <th className="p-3 font-semibold">Res. Rate</th>
                  <th className="p-3 font-semibold rounded-tr-lg">Avg Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {deptAnalytics.map((dept, i) => {
                  const resRate = dept.totalComplaints ? Math.round((dept.resolved / dept.totalComplaints) * 100) : 0;
                  return (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="p-3 font-medium text-navy">{dept.department}</td>
                      <td className="p-3">{dept.totalComplaints}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500" style={{width: `${resRate}%`}}></div>
                          </div>
                          <span className="text-xs">{resRate}%</span>
                        </div>
                      </td>
                      <td className="p-3">{dept.avgResolutionTime}h</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Officer Management */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h3 className="font-bold text-navy flex items-center gap-2 mb-6">
          <Briefcase size={18} className="text-saffron" /> Officer Management
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="p-4 font-semibold rounded-tl-lg">Officer Name</th>
                <th className="p-4 font-semibold">Department</th>
                <th className="p-4 font-semibold">Region</th>
                <th className="p-4 font-semibold text-center">Load</th>
                <th className="p-4 font-semibold text-center">Resolved</th>
                <th className="p-4 font-semibold text-center">Trust</th>
                <th className="p-4 font-semibold text-right rounded-tr-lg">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {officers.map(officer => (
                <tr key={officer._id} className={`hover:bg-gray-50 transition-colors ${!officer.isActive ? 'opacity-50' : ''}`}>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${officer.isActive ? 'bg-navy' : 'bg-gray-400'}`}>
                        {officer.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{officer.name}</p>
                        <p className="text-xs text-gray-500">{officer.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-gray-600">{officer.departmentId?.code || 'N/A'}</td>
                  <td className="p-4 text-gray-600">{officer.region}</td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${officer.currentLoad > 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {officer.currentLoad}
                    </span>
                  </td>
                  <td className="p-4 text-center text-gray-600 font-medium">{officer.resolvedComplaints}</td>
                  <td className="p-4 text-center">
                    <span className="text-blue-600 font-bold">{officer.trustScore}</span>
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => toggleOfficerActive(officer._id)}
                      className={`text-xs px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1 justify-end w-24 ml-auto ${
                        officer.isActive 
                          ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                          : 'bg-green-50 text-green-600 hover:bg-green-100'
                      }`}
                    >
                      {officer.isActive ? <><UserX size={14}/> Deactivate</> : <><UserCheck size={14}/> Activate</>}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
