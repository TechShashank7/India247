import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ComplaintCard from '../components/ComplaintCard';
import { citizens } from '../data/mockData';

const FeedPage = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/complaints');
        setComplaints(res.data);
      } catch (error) {
        console.error('Error fetching complaints:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchComplaints();
  }, []);

  return (
    <div className="pt-24 pb-12 min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Main Feed */}
          <div className="w-full lg:w-[65%]">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-navy">What's Happening Around You</h1>
              <div className="flex gap-2">
                <select className="bg-white border text-sm font-semibold border-gray-200 rounded-lg px-3 py-2 outline-none text-gray-600 focus:border-saffron">
                  <option>Latest</option>
                  <option>Most Upvoted</option>
                  <option>Near Me</option>
                </select>
                <select className="bg-white border text-sm font-semibold border-gray-200 rounded-lg px-3 py-2 outline-none text-gray-600 focus:border-saffron hidden sm:block">
                  <option>All Categories</option>
                  <option>Roads</option>
                  <option>Water</option>
                  <option>Garbage</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin text-saffron w-8 h-8 border-4 border-current border-t-transparent rounded-full"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {complaints.map(complaint => (
                  <ComplaintCard key={complaint._id || complaint.id} complaint={complaint} />
                ))}
              </div>
            )}
            
            <div className="mt-8 text-center">
              <button className="btn-outline">
                Load More Complaints
              </button>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-full lg:w-[35%] space-y-8">
            
            {/* Trending */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-navy mb-4 flex items-center gap-2">
                <span className="text-saffron">🔥</span> Trending Issues
              </h2>
              <div className="space-y-4">
                {[...complaints].sort((a,b) => b.upvotes - a.upvotes).slice(0, 3).map((issue, i) => (
                  <div key={issue._id || issue.id} className="flex gap-4 items-start group cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded-lg transition-colors">
                    <div className="text-2xl font-black text-gray-200 group-hover:text-saffron transition-colors">#{i+1}</div>
                    <div>
                      <h4 className="font-semibold text-gray-800 text-sm leading-tight mb-1">{issue.title}</h4>
                      <p className="text-xs text-gray-500">{issue.location} • {issue.upvotes} upvotes</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Leaderboard */}
            <div className="bg-navy rounded-2xl p-6 shadow-xl text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-saffron/20 rounded-full blur-2xl -mt-10 -mr-10"></div>
              
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2 relative z-10">
                <span>⭐</span> Citizen Leaderboard
              </h2>
              
              <div className="space-y-4 relative z-10">
                {citizens.map((citizen, i) => (
                  <div key={i} className="flex items-center justify-between pb-3 border-b border-gray-700/50 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-xs">
                        {citizen.rank}
                      </div>
                      <span className="font-semibold text-sm">{citizen.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-accent-gold font-bold text-sm tracking-wide">{citizen.points} pts</span>
                      <span className="text-lg" title="Badge" aria-label="Badge">{citizen.badge}</span>
                    </div>
                  </div>
                ))}
              </div>
              
              <button className="w-full mt-6 py-2.5 text-sm font-semibold rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
                View Full Rankings
              </button>
            </div>
            
            {/* Banner */}
            <div className="bg-gradient-to-br from-saffron to-orange-500 rounded-2xl p-6 text-white shadow-lg text-center transform hover:scale-[1.02] transition-transform cursor-pointer">
              <div className="text-4xl mb-3">🎁</div>
              <h3 className="font-bold text-lg mb-2">Redeem Rewards!</h3>
              <p className="text-sm text-orange-100 mb-4 font-medium opacity-90">Got 500+ points? Claim your free Metro card today.</p>
              <button className="bg-white text-saffron px-4 py-2 rounded-lg font-bold text-sm hover:shadow-md transition-shadow">
                View Rewards Pool
              </button>
            </div>

          </div>
          
        </div>
      </div>
    </div>
  );
};

export default FeedPage;
