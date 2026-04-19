import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ComplaintCard from '../components/ComplaintCard';
import ImageModal from '../components/ImageModal';
import { citizens } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';

const FeedPage = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sort, setSort] = useState('latest');
  const [category, setCategory] = useState('All');
  const [showComments, setShowComments] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`https://api.india247.shashankraj.in/api/complaints/feed?sort=${sort}&category=${category}&limit=1000`);
      const data = Array.isArray(res.data) ? res.data : (res.data.data || []);
      setComplaints(data);
    } catch (error) {
      console.error('Error fetching complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [sort, category]);

  useEffect(() => {
    if (location.state?.scrollToComplaintId && complaints.length > 0) {
      setTimeout(() => {
        const el = document.getElementById(`complaint-${location.state.scrollToComplaintId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-4', 'ring-saffron', 'ring-opacity-50', 'transition-all', 'duration-1000', 'rounded-2xl');
          setTimeout(() => el.classList.remove('ring-4', 'ring-saffron', 'ring-opacity-50'), 2000);
          window.history.replaceState({}, document.title);
        }
      }, 500);
    }
  }, [complaints, location.state]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpvote = async (id) => {
    // 🔥 NEW: Optimistic UI update
    setComplaints(prev => prev.map(c =>
      c._id === id ? { ...c, upvotes: (c.upvotes || 0) + 1 } : c
    ));

    try {
      await axios.post(`https://api.india247.shashankraj.in/api/complaints/${id}/upvote`);
    } catch (err) {
      console.error("Upvote failed", err);
      // Revert if failed
      setComplaints(prev => prev.map(c =>
        c._id === id ? { ...c, upvotes: Math.max((c.upvotes || 1) - 1, 0) } : c
      ));
    }
  };

  const handleComment = async (id, text) => {
    // 🔥 NEW: Optimistic UI update
    const newComment = {
      text,
      userName: user?.name || 'Anonymous User',
      userId: user?.uid || 'anonymous_id',
      userAvatar: (user?.name || 'A')[0].toUpperCase(),
      createdAt: new Date().toISOString()
    };

    setComplaints(prev => prev.map(c => {
      if (c._id === id) {
        return {
          ...c,
          comments: [...(Array.isArray(c.comments) ? c.comments : []), newComment]
        };
      }
      return c;
    }));

    try {
      await axios.post(`https://api.india247.shashankraj.in/api/complaints/${id}/comment`, {
        text,
        userName: user?.name || 'Anonymous User',
        userId: user?.uid || 'anonymous_id'
      });
    } catch (err) {
      console.error("Comment failed", err);
    }
  };

  const handleShare = async (id) => {
    // 🔥 NEW: Optimistic UI update
    setComplaints(prev => prev.map(c =>
      c._id === id ? { ...c, shares: (c.shares || 0) + 1 } : c
    ));

    try {
      await axios.post(`https://api.india247.shashankraj.in/api/complaints/${id}/share`);

      // 🔥 NEW: Improved Share Functionality
      const complaint = complaints.find(c => c._id === id);
      const shareUrl = `${window.location.origin}/feed`;

      if (navigator.share && complaint) {
        await navigator.share({
          title: complaint.title,
          text: complaint.description ? complaint.description.substring(0, 100) + '...' : 'Check out this issue',
          url: shareUrl
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        const toast = document.createElement("div");
        toast.className = "fixed bottom-20 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-full shadow-xl text-sm z-50 transition-opacity duration-300";
        toast.innerText = "Link copied to clipboard!";
        document.body.appendChild(toast);
        setTimeout(() => {
          toast.style.opacity = '0';
          setTimeout(() => toast.remove(), 300);
        }, 2500);
      }
    } catch (err) {
      console.error("Share failed", err);
    }
  };

  const handleImageClick = (imageUrl) => {
    setSelectedImage(imageUrl);
    setIsModalOpen(true);
  };

  const toggleComments = (id) => {
    setShowComments(showComments === id ? null : id);
  };

  // Dynamic categories from DB
  const categories = ["All", ...new Set(complaints.map(c => c.category))];

  // Trending Logic for Sidebar
  const trendingIssues = [...complaints]
    .sort((a, b) => {
      const scoreA = (a.upvotes || 0) * 2 + (a.comments?.length || 0) + (a.shares || 0);
      const scoreB = (b.upvotes || 0) * 2 + (b.comments?.length || 0) + (b.shares || 0);
      return scoreB - scoreA;
    })
    .slice(0, 3);

  return (
    <div className="pt-24 pb-12 min-h-screen bg-background">
      {/* ✏️ UPDATED: Reduced padding on mobile padding */}
      <div className="px-2 sm:px-6 lg:px-8">

        <div className="flex flex-col lg:flex-row gap-8">

          {/* Main Feed */}
          {/* ✏️ UPDATED: w-full taking full width on mobile */}
          <div className="w-full lg:w-[65%]">

            {/* 🔥 NEW: Mobile Hot Issues Section */}
            <div className="w-full lg:hidden mb-6 block">
              <h2 className="text-base sm:text-lg font-bold text-navy mb-3 flex items-center gap-2">
                <span className="text-saffron">🔥</span> Hot Issues
              </h2>
              <div className="flex overflow-x-auto pb-4 gap-4 hide-scrollbar snap-x">
                {trendingIssues.map((issue, i) => (
                  <div
                    key={`mobile-trend-${issue._id}`}
                    className="min-w-[280px] bg-white rounded-xl p-4 shadow-sm border border-gray-100 snap-center shrink-0 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      const el = document.getElementById(`complaint-${issue._id}`);
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        el.classList.add('ring-4', 'ring-saffron', 'ring-opacity-50', 'transition-all', 'duration-1000', 'rounded-2xl');
                        setTimeout(() => el.classList.remove('ring-4', 'ring-saffron', 'ring-opacity-50'), 2000);
                      }
                    }}
                  >
                    <div className="flex gap-3 items-start">
                      <div className="text-xl font-black text-saffron opacity-50">#{i + 1}</div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800 text-sm leading-tight mb-2 line-clamp-2">{issue.title}</h4>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500 font-medium">
                          <span>{issue.upvotes || 0} upvotes</span>
                          <span>•</span>
                          <span>{issue.comments?.length || 0} comments</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 🔥 NEW: Mobile horizontally scrollable chips for Filter & Category */}
            <div className="block lg:hidden mb-6">
              <div className="flex overflow-x-auto pb-2 gap-2 hide-scrollbar">
                {['latest', 'upvotes', 'trending'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSort(s)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors active:scale-95 ${sort === s ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600'}`}
                  >
                    {s === 'latest' ? 'Latest' : s === 'upvotes' ? 'Most Upvoted' : 'Trending'}
                  </button>
                ))}
              </div>
              <div className="flex overflow-x-auto pt-1 pb-2 gap-2 hide-scrollbar">
                {categories.map(cat => (
                  <button
                    key={`mobile-cat-${cat}`}
                    onClick={() => setCategory(cat)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors active:scale-95 ${category === cat ? 'bg-saffron text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="hidden lg:flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-navy">What's Happening Around You</h1>
              <div className="flex gap-2">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value.toLowerCase().replace('most ', ''))}
                  className="bg-white border text-sm font-semibold border-gray-200 rounded-lg px-3 py-2 outline-none text-gray-600 focus:border-saffron cursor-pointer"
                >
                  <option value="latest">Latest</option>
                  <option value="upvotes">Most Upvoted</option>
                  <option value="trending">Trending</option>
                </select>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="bg-white border text-sm font-semibold border-gray-200 rounded-lg px-3 py-2 outline-none text-gray-600 focus:border-saffron cursor-pointer"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              // 🔥 NEW: Skeleton UI for Loading
              <div className="space-y-6">
                {[1, 2, 3].map((n) => (
                  <div key={`skel-${n}`} className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100 animate-pulse">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3 w-full">
                        <div className="w-10 h-10 bg-gray-200 rounded-full shrink-0"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/5"></div>
                        </div>
                      </div>
                    </div>
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
                    <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6 mb-4"></div>
                    <div className="h-48 bg-gray-200 rounded-xl mb-4"></div>
                    <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                      <div className="w-20 h-6 bg-gray-200 rounded"></div>
                      <div className="flex gap-4">
                        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : complaints.length === 0 ? (
              // ✏️ UPDATED: Empty state design
              <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm flex flex-col items-center justify-center min-h-[300px]">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <span className="text-4xl">📂</span>
                </div>
                <h3 className="text-xl font-bold text-navy mb-2">No Reports Found</h3>
                <p className="text-gray-500 mb-6 max-w-sm">We couldn't find any issues matching your active filter and category combination.</p>
                <button
                  onClick={() => { setSort('latest'); setCategory('All'); }}
                  className="bg-navy text-white px-6 py-2 rounded-full font-semibold text-sm hover:bg-navy/90 active:scale-95 transition-all"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                {complaints.map(complaint => (
                  <div key={complaint._id} id={`complaint-${complaint._id}`}>
                    <ComplaintCard
                      complaint={complaint}
                      onImageClick={handleImageClick}
                      onUpvote={handleUpvote}
                      onComment={handleComment}
                      onShare={handleShare}
                      showComments={showComments}
                      toggleComments={toggleComments}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="mt-8 text-center">
              <button className="btn-outline">
                Load More Complaints
              </button>
            </div>
          </div>

          {/* Right Sidebar - Hidden on standard mobile, visible on lg and above */}
          <div className="hidden lg:block w-full lg:w-[35%] space-y-8">

            {/* Trending Section */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-navy mb-4 flex items-center gap-2">
                <span className="text-saffron">🔥</span> Hot Issues
              </h2>
              <div className="space-y-4">
                {trendingIssues.map((issue, i) => (
                  <div
                    key={issue._id}
                    className="flex gap-4 items-start group cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded-lg transition-colors"
                    onClick={() => {
                      const el = document.getElementById(`complaint-${issue._id}`);
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        el.classList.add('ring-4', 'ring-saffron', 'ring-opacity-50', 'transition-all', 'duration-1000', 'rounded-2xl');
                        setTimeout(() => el.classList.remove('ring-4', 'ring-saffron', 'ring-opacity-50'), 2000);
                      }
                    }}
                  >
                    <div className="text-2xl font-black text-gray-200 group-hover:text-saffron transition-colors">#{i + 1}</div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800 text-sm leading-tight mb-1">{issue.title}</h4>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500 font-medium">
                        <span>{issue.upvotes || 0} upvotes</span>
                        <span>•</span>
                        <span>{issue.comments?.length || 0} comments</span>
                        <span>•</span>
                        <span>{issue.shares || 0} shares</span>
                      </div>
                    </div>
                  </div>
                ))}
                {trendingIssues.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">Nothing trending yet.</p>
                )}
              </div>
            </div>

            {/* Quick Stats Banner */}
            <div className="bg-navy rounded-2xl p-6 shadow-xl text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-saffron/20 rounded-full blur-2xl -mt-10 -mr-10"></div>
              <h2 className="text-lg font-bold mb-4 relative z-10">Community Pulse</h2>
              <div className="grid grid-cols-2 gap-4 relative z-10">
                <div className="bg-white/10 p-3 rounded-xl border border-white/5">
                  <p className="text-xs text-indigo-100 uppercase font-semibold">Total resolved</p>
                  <p className="text-2xl font-black text-saffron">84%</p>
                </div>
                <div className="bg-white/10 p-3 rounded-xl border border-white/5">
                  <p className="text-xs text-indigo-100 uppercase font-semibold">Active cases</p>
                  <p className="text-2xl font-black text-white">42</p>
                </div>
              </div>
              <p className="text-[10px] text-indigo-200 mt-4 opacity-70">India247 ensures every voice is heard and every issue is tracked.</p>
            </div>
          </div>

        </div>
      </div>
      <ImageModal
        isOpen={isModalOpen}
        imageUrl={selectedImage}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-35 right-6 p-3 bg-navy text-white rounded-full shadow-lg hover:bg-navy/90 active:scale-95 transition-all z-40"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6" /></svg>
        </button>
      )}
    </div>
  );
};

export default FeedPage;

