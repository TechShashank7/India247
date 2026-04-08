import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ComplaintCard from '../components/ComplaintCard';
import ImageModal from '../components/ImageModal';
import { citizens } from '../data/mockData';
import { useAuth } from '../context/AuthContext';

const FeedPage = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sort, setSort] = useState('latest');
  const [category, setCategory] = useState('All');
  const [showComments, setShowComments] = useState(null);
  const { user } = useAuth();

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`https://api.india247.shashankraj.in/api/complaints/feed?sort=${sort}&category=${category}`);
      setComplaints(res.data);
    } catch (error) {
      console.error('Error fetching complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [sort, category]);

  const handleUpvote = async (id) => {
    try {
      await axios.post(`https://api.india247.shashankraj.in/api/complaints/${id}/upvote`);
      fetchComplaints(); // Refresh UI
    } catch (err) {
      console.error("Upvote failed", err);
    }
  };

  const handleComment = async (id, text) => {
    try {
      await axios.post(`https://api.india247.shashankraj.in/api/complaints/${id}/comment`, { 
        text,
        userName: user?.name || 'Anonymous User',
        userId: user?.uid || 'anonymous_id'
      });
      fetchComplaints(); // Refresh UI
    } catch (err) {
      console.error("Comment failed", err);
    }
  };

  const handleShare = async (id) => {
    try {
      await axios.post(`https://api.india247.shashankraj.in/api/complaints/${id}/share`);
      alert("Share link copied! Spread the word on WhatsApp, Twitter, and Instagram.");
      fetchComplaints(); // Refresh UI
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
      <div className="px-4 sm:px-6 lg:px-8">
        
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Main Feed */}
          <div className="w-full lg:w-[65%]">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-navy">What's Happening Around You</h1>
              <div className="flex gap-2">
                <select 
                  value={sort}
                  onChange={(e) => setSort(e.target.value.toLowerCase().replace('most ', ''))}
                  className="bg-white border text-sm font-semibold border-gray-200 rounded-lg px-3 py-2 outline-none text-gray-600 focus:border-saffron"
                >
                  <option value="latest">Latest</option>
                  <option value="upvotes">Most Upvoted</option>
                  <option value="trending">Trending</option>
                </select>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="bg-white border text-sm font-semibold border-gray-200 rounded-lg px-3 py-2 outline-none text-gray-600 focus:border-saffron hidden sm:block"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin text-saffron w-8 h-8 border-4 border-current border-t-transparent rounded-full"></div>
              </div>
            ) : complaints.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
                <div className="text-4xl mb-4">📍</div>
                <h3 className="text-xl font-bold text-navy mb-2">No complaints found</h3>
                <p className="text-gray-500">Try changing your filters or category.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {complaints.map(complaint => (
                  <ComplaintCard 
                    key={complaint._id} 
                    complaint={complaint} 
                    onImageClick={handleImageClick}
                    onUpvote={handleUpvote}
                    onComment={handleComment}
                    onShare={handleShare}
                    showComments={showComments}
                    toggleComments={toggleComments}
                  />
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
            
            {/* Trending Section */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-navy mb-4 flex items-center gap-2">
                <span className="text-saffron">🔥</span> Hot Issues
              </h2>
              <div className="space-y-4">
                {trendingIssues.map((issue, i) => (
                  <div key={issue._id} className="flex gap-4 items-start group cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded-lg transition-colors">
                    <div className="text-2xl font-black text-gray-200 group-hover:text-saffron transition-colors">#{i+1}</div>
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
    </div>
  );
};

export default FeedPage;

