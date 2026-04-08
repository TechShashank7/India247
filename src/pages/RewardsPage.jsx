import React, { useState, useEffect } from 'react';
import { Trophy, Star, TrendingUp, Gift, Zap, MessageSquare, ThumbsUp, FileText, Award, ChevronRight, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Step 5: Badge System
function getBadge(points) {
  if (points >= 1000) return "👑 Champion";
  if (points >= 500) return "⭐ Expert";
  if (points >= 250) return "🏆 Advocate";
  if (points >= 100) return "🎖️ Contributor";
  if (points >= 50) return "📝 Reporter";
  return "🌱 Beginner";
}

// Step 7: Progress Bar - Next Level
function getNextLevel(points) {
  if (points < 50) return { target: 50, label: "📝 Reporter" };
  if (points < 100) return { target: 100, label: "🎖️ Contributor" };
  if (points < 250) return { target: 250, label: "🏆 Advocate" };
  if (points < 500) return { target: 500, label: "⭐ Expert" };
  if (points < 1000) return { target: 1000, label: "👑 Champion" };
  return { target: points, label: "👑 Max Level" };
}

// Rewards catalog (UI data — these define what can be redeemed)
const rewardsCatalog = [
  { id: 1, title: "Metro Smart Card", pts: 200, icon: "🚇" },
  { id: 2, title: "Mobile Recharge ₹50", pts: 150, icon: "📱" },
  { id: 3, title: "Uber Ride 20% Off", pts: 350, icon: "🛵" },
  { id: 4, title: "Swiggy ₹100 Coupon", pts: 400, icon: "🍔" },
  { id: 5, title: "Movie Ticket", pts: 600, icon: "🎬" },
  { id: 6, title: "Mystery Reward", pts: 1000, icon: "🎁" },
];

// All badge tiers for showcase
const badgeTiers = [
  { name: "🌱 Beginner", threshold: 0, color: "green", bg: "bg-green-50", border: "border-green-300", text: "text-green-700" },
  { name: "📝 Reporter", threshold: 50, color: "blue", bg: "bg-blue-50", border: "border-blue-300", text: "text-blue-700" },
  { name: "🎖️ Contributor", threshold: 100, color: "purple", bg: "bg-purple-50", border: "border-purple-300", text: "text-purple-700" },
  { name: "🏆 Advocate", threshold: 250, color: "orange", bg: "bg-orange-50", border: "border-saffron", text: "text-orange-700" },
  { name: "⭐ Expert", threshold: 500, color: "yellow", bg: "bg-yellow-50", border: "border-yellow-400", text: "text-yellow-700" },
  { name: "👑 Champion", threshold: 1000, color: "gold", bg: "bg-amber-50", border: "border-amber-400", text: "text-amber-700" },
];

const RewardsPage = () => {
  const [tab, setTab] = useState('rewards');

  // Step 6: Real state from API
  const [points, setPoints] = useState(0);
  const [breakdown, setBreakdown] = useState({ filed: 0, resolved: 0, totalUpvotes: 0, totalComments: 0 });
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  const userName = user?.name || "Citizen";

  // Fetch data from backend
  useEffect(() => {
    setLoading(true);

    Promise.all([
      fetch(`https://api.india247.shashankraj.in/api/complaints/user/points/${encodeURIComponent(userName)}`)
        .then(res => res.json()),
      fetch("https://api.india247.shashankraj.in/api/complaints/leaderboard")
        .then(res => res.json())
    ]).then(([pointsData, leaderboardData]) => {
      setPoints(pointsData.points || 0);
      setBreakdown({
        filed: pointsData.filed || 0,
        resolved: pointsData.resolved || 0,
        totalUpvotes: pointsData.totalUpvotes || 0,
        totalComments: pointsData.totalComments || 0,
      });
      setLeaderboard(leaderboardData || []);
      setLoading(false);
    }).catch(err => {
      console.error("Failed to fetch rewards data:", err);
      setLoading(false);
    });
  }, []);

  const badge = getBadge(points);
  const nextLevel = getNextLevel(points);
  const progress = nextLevel.target > 0 ? Math.min((points / nextLevel.target) * 100, 100) : 100;

  // Get initials from name
  const words = userName.trim().split(/\s+/);
  const initials = words.length >= 2 
    ? (words[0][0] + words[1][0]).toUpperCase() 
    : (words[0]?.[0] || 'C').toUpperCase();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 pb-12 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={48} className="animate-spin text-saffron" />
          <p className="text-gray-500 font-medium">Loading your rewards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12">
      {/* Hero Profile */}
      <div className="bg-navy text-white pt-10 pb-20 px-4 relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-saffron/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl"></div>
        
        <div className="max-w-4xl mx-auto relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-white/10 rounded-full border-4 border-white/20 flex items-center justify-center p-1">
              <div className="w-full h-full bg-saffron rounded-full flex items-center justify-center text-3xl font-bold">
                {initials}
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-1">{userName}</h1>
              <p className="text-gray-300 flex items-center gap-2">
                <Trophy size={16} className="text-accent-gold" />
                {badge}
              </p>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 text-center md:text-right w-full md:w-auto">
            <p className="text-indigo-100 text-sm font-semibold mb-1 uppercase tracking-wider">Total Impact Points</p>
            <div className="text-5xl font-black text-accent-gold flex items-center justify-center md:justify-end gap-2 drop-shadow-lg">
              <Star size={36} className="fill-current" />
              {points.toLocaleString()}
            </div>
            
            {/* Step 7: Dynamic Progress Bar */}
            <div className="mt-4 text-left">
              <div className="flex justify-between text-xs text-gray-300 font-medium mb-1">
                <span>Progress to {nextLevel.label}</span>
                <span>{points} / {nextLevel.target} pts</span>
              </div>
              <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-gold rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20">
        
        {/* Badges Showcase - Dynamic based on points */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-lg font-bold text-navy mb-4">Your Badges</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {badgeTiers.map((tier, idx) => {
              const unlocked = points >= tier.threshold;
              return (
                <div
                  key={idx}
                  className={`rounded-xl p-4 text-center border-2 group cursor-help transition-all ${
                    unlocked
                      ? `${tier.bg} ${tier.border}`
                      : 'bg-gray-50 border-gray-200 opacity-50 grayscale'
                  }`}
                >
                  <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">
                    {tier.name.split(' ')[0]}
                  </div>
                  <h3 className={`font-bold text-xs ${unlocked ? tier.text : 'text-gray-500'}`}>
                    {tier.name.split(' ').slice(1).join(' ')}
                  </h3>
                  <p className={`text-xs mt-1 ${unlocked ? 'text-green-600 font-semibold' : 'text-gray-400'}`}>
                    {unlocked ? '✓ Unlocked' : `${tier.threshold} pts`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 11: Points Breakdown Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <FileText size={20} />
            </div>
            <div>
              <p className="text-2xl font-black text-navy">{breakdown.filed}</p>
              <p className="text-xs text-gray-500 font-medium">Complaints Filed</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
              <Award size={20} />
            </div>
            <div>
              <p className="text-2xl font-black text-navy">{breakdown.resolved}</p>
              <p className="text-xs text-gray-500 font-medium">Resolved</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
              <ThumbsUp size={20} />
            </div>
            <div>
              <p className="text-2xl font-black text-navy">{breakdown.totalUpvotes}</p>
              <p className="text-xs text-gray-500 font-medium">Upvotes Earned</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
              <MessageSquare size={20} />
            </div>
            <div>
              <p className="text-2xl font-black text-navy">{breakdown.totalComments}</p>
              <p className="text-xs text-gray-500 font-medium">Comments Made</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-8">
          <button 
            onClick={() => setTab('rewards')}
            className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 -mb-px ${tab === 'rewards' ? 'border-saffron text-saffron' : 'border-transparent text-gray-500 hover:text-navy'}`}
          >
            Redeem Rewards
          </button>
          <button 
            onClick={() => setTab('leaderboard')}
            className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 -mb-px ${tab === 'leaderboard' ? 'border-saffron text-saffron' : 'border-transparent text-gray-500 hover:text-navy'}`}
          >
            Leaderboard
          </button>
          <button 
            onClick={() => setTab('howto')}
            className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 -mb-px ${tab === 'howto' ? 'border-saffron text-saffron' : 'border-transparent text-gray-500 hover:text-navy'}`}
          >
            How it Works
          </button>
        </div>

        {/* Step 8: Redeem Rewards - Uses REAL points */}
        {tab === 'rewards' && (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 animate-in fade-in">
            {rewardsCatalog.map(reward => {
              const canAfford = points >= reward.pts;
              return (
                <div key={reward.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col hover:-translate-y-1 transition-transform">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-inner">
                    {reward.icon}
                  </div>
                  <h3 className="font-bold text-navy text-lg leading-tight mb-2">{reward.title}</h3>
                  <div className="flex items-center gap-1.5 text-accent-gold font-black mb-2">
                    <Star size={16} className="fill-current" />
                    <span>{reward.pts} pts</span>
                  </div>
                  {/* Show how many more points needed */}
                  {!canAfford && (
                    <p className="text-xs text-gray-400 mb-4">
                      Need {reward.pts - points} more points
                    </p>
                  )}
                  {canAfford && <div className="mb-4" />}
                  <div className="mt-auto">
                    <button 
                      disabled={!canAfford}
                      className={`w-full py-3 rounded-xl font-bold transition-colors ${canAfford ? 'bg-saffron text-white shadow-md hover:bg-orange-600' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                    >
                      {canAfford ? 'Redeem Now' : 'Not Enough Points'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Step 9: Leaderboard - Real data from API */}
        {tab === 'leaderboard' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in">
            <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-navy flex items-center gap-2"><TrendingUp size={20}/> Top Citizens</h3>
              <span className="text-sm font-semibold text-gray-500">All Regions</span>
            </div>
            <div className="divide-y divide-gray-50">
              {leaderboard.length === 0 && (
                <div className="p-8 text-center text-gray-400">
                  <Trophy size={48} className="mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No leaderboard data yet</p>
                  <p className="text-sm">File complaints to earn points!</p>
                </div>
              )}
              {leaderboard.map((user, idx) => {
                const userBadge = getBadge(user.points);
                return (
                  <div key={idx} className={`p-4 flex items-center justify-between hover:bg-gray-50 transition-colors ${idx < 3 ? 'bg-orange-50/30' : ''}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${
                        idx === 0 ? 'bg-yellow-100 text-yellow-600' :
                        idx === 1 ? 'bg-gray-200 text-gray-600' :
                        idx === 2 ? 'bg-orange-200 text-orange-700' : 'bg-gray-100 text-gray-400'
                      }`}>
                        #{idx + 1}
                      </div>
                      <div>
                        <h4 className="font-bold text-navy">{user.name}</h4>
                        <p className="text-xs text-gray-500 font-medium">{userBadge}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-2xl" title="Badge">{userBadge.split(' ')[0]}</div>
                      <div className="bg-orange-50 text-saffron px-3 py-1 rounded-full font-bold text-sm tracking-wide border border-orange-100">
                        {user.points.toLocaleString()} pts
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 10: How it Works - Updated point rules */}
        {tab === 'howto' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 animate-in fade-in max-w-2xl">
            <h3 className="text-xl font-bold text-navy mb-6">How to Earn Points</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-4 pb-4 border-b border-gray-100">
                <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0 font-bold mt-1">✅</div>
                <div>
                  <h4 className="font-bold text-gray-800">File a complaint</h4>
                  <p className="text-sm text-gray-500">Every genuine complaint you file earns you points.</p>
                </div>
                <div className="ml-auto font-black text-india-green bg-green-50 px-3 py-1 rounded shrink-0">+10 pts</div>
              </li>
              <li className="flex items-start gap-4 pb-4 border-b border-gray-100">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 font-bold mt-1">🎯</div>
                <div>
                  <h4 className="font-bold text-gray-800">Complaint resolved</h4>
                  <p className="text-sm text-gray-500">When the department fixes the issue you reported.</p>
                </div>
                <div className="ml-auto font-black text-india-green bg-green-50 px-3 py-1 rounded shrink-0">+25 pts</div>
              </li>
              <li className="flex items-start gap-4 pb-4 border-b border-gray-100">
                <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 font-bold mt-1">👍</div>
                <div>
                  <h4 className="font-bold text-gray-800">Receive an upvote</h4>
                  <p className="text-sm text-gray-500">Each upvote on your complaints earns you points.</p>
                </div>
                <div className="ml-auto font-black text-india-green bg-green-50 px-3 py-1 rounded shrink-0">+2 pts</div>
              </li>
              <li className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 font-bold mt-1">💬</div>
                <div>
                  <h4 className="font-bold text-gray-800">Comment on a complaint</h4>
                  <p className="text-sm text-gray-500">Engage with the community by commenting.</p>
                </div>
                <div className="ml-auto font-black text-india-green bg-green-50 px-3 py-1 rounded shrink-0">+1 pt</div>
              </li>
            </ul>

            {/* Badge Tiers Overview */}
            <div className="mt-8 pt-6 border-t border-gray-100">
              <h3 className="text-lg font-bold text-navy mb-4">Badge Levels</h3>
              <div className="space-y-2">
                {badgeTiers.map((tier, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{tier.name.split(' ')[0]}</span>
                      <span className="font-semibold text-gray-700">{tier.name.split(' ').slice(1).join(' ')}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-500">{tier.threshold}+ pts</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default RewardsPage;
