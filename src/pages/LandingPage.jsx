import React, { useState, useEffect, useRef } from 'react';

const CountUp = ({ end, duration = 2000 }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let startTimestamp = null;
          const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            setCount(Math.floor(progress * end));
            if (progress < 1) {
              window.requestAnimationFrame(step);
            } else {
              setCount(end);
            }
          };
          window.requestAnimationFrame(step);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);

  return <span ref={ref}>{count.toLocaleString()}</span>;
};
import { Link, Navigate } from 'react-router-dom';
import { Shield, Smartphone, Zap, MapPin, Search, X, Send } from 'lucide-react';
import axios from 'axios';
import ComplaintCard from '../components/ComplaintCard';
import { mockComplaints } from '../data/mockData';
import { useAuth } from '../context/AuthContext';

const LandingPage = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { user, loading } = useAuth();
  const [recentComplaints, setRecentComplaints] = useState([]);

  if (loading) return null;

  if (user?.role === 'officer') {
    return <Navigate to="/officer" />;
  }

  useEffect(() => {
    const fetchTopComplaints = async () => {
      try {
        const response = await axios.get('https://api.india247.shashankraj.in/api/complaints/feed?sort=upvotes');
        const data = Array.isArray(response.data) ? response.data : (response.data.data || []);
        setRecentComplaints(data.slice(0, 3));
      } catch (error) {
        console.error("Failed to fetch top complaints:", error);
        // Fallback to mock data if API fails
        setRecentComplaints(mockComplaints.slice(0, 3));
      }
    };
    fetchTopComplaints();
  }, []);

  return (
    <div className="pt-20 bg-[var(--color-surface)] min-h-screen">
      {/* Hero Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-8 md:py-16 animate-in fade-in duration-700">
        <div className="max-w-7xl mx-auto">
          <div className="card bg-[var(--color-surface-container-lowest)] p-8 md:p-16 mb-8 rounded-3xl">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-[var(--color-navy)] leading-tight mb-6 flex flex-col tracking-tight">
                  <span className="text-[var(--color-primary)]">Report.</span>
                  <span>Track.</span>
                  <span>Resolve.</span>
                </h1>
                <p className="text-lg md:text-xl text-[var(--color-secondary)] mb-8 max-w-lg font-medium">
                  India's smartest civic complaint platform. File a complaint in 60 seconds.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                  <Link to="/report" className="btn-primary text-center flex items-center justify-center gap-2">
                    Report Now <span aria-hidden="true">&rarr;</span>
                  </Link>
                  <Link to="/tracker" className="btn-secondary text-center">
                    Track Complaint
                  </Link>
                </div>

                <div className="flex items-center gap-2 text-sm text-[var(--color-secondary)] font-medium bg-[var(--color-surface-container-low)] inline-flex px-4 py-2 rounded-full">
                  <Shield size={16} className="text-[var(--color-primary)]" />
                  <span>Your identity stays protected.</span>
                </div>
              </div>

              {/* Phone Mockup Frame */}
              <div className="hidden md:block relative mx-auto w-full max-w-[300px] aspect-[9/19] bg-[var(--color-card)] rounded-[2.5rem] shadow-2xl border-[6px] border-[var(--color-surface-container)] overflow-hidden">
                <div className="bg-[var(--color-surface)] h-full p-4 pt-8 flex flex-col gap-4 overflow-hidden relative">
                  <div className="flex justify-start">
                    <div className="bg-[var(--color-surface-container-lowest)] border border-[rgba(226,191,180,0.2)] p-4 rounded-2xl rounded-tl-sm shadow-[0_4px_12px_rgba(25,28,30,0.04)] max-w-[85%] text-sm font-medium text-[var(--color-secondary)]">
                      Namaste! What civic issue are you facing today? 🙏
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-container)] text-white p-4 rounded-2xl rounded-tr-sm shadow-md max-w-[85%] text-sm font-medium">
                      There's a big pothole near my house
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-[var(--color-surface-container-lowest)] border border-[rgba(226,191,180,0.2)] p-4 rounded-2xl rounded-tl-sm shadow-[0_4px_12px_rgba(25,28,30,0.04)] max-w-[85%] text-sm font-medium text-[var(--color-secondary)]">
                      Got it! I've detected this as a Road issue. Can you share a photo?
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-container)] text-white p-4 rounded-2xl rounded-tr-sm shadow-md text-sm font-medium">
                      📸 [Photo attached]
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works & Stats */}
      <section className="px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-3 gap-8">
          
          {/* Stats Card */}
          <div className="card bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-container)] lg:col-span-1 text-white flex flex-col justify-center rounded-3xl">
            <h2 className="text-2xl font-bold mb-8 text-white">Impact by the numbers</h2>
            <div className="space-y-6">
              <div>
                <div className="text-4xl font-extrabold mb-1"><CountUp end={14283} /></div>
                <div className="text-sm font-semibold opacity-80 uppercase tracking-wide">Complaints Filed</div>
              </div>
              <div className="h-[1px] bg-white/20 w-full" />
              <div>
                <div className="text-4xl font-extrabold mb-1"><CountUp end={10941} /></div>
                <div className="text-sm font-semibold opacity-80 uppercase tracking-wide">Issues Resolved</div>
              </div>
              <div className="h-[1px] bg-white/20 w-full" />
              <div>
                <div className="text-4xl font-extrabold mb-1"><CountUp end={91} />%</div>
                <div className="text-sm font-semibold opacity-80 uppercase tracking-wide">Citizen Satisfaction</div>
              </div>
            </div>
          </div>

          {/* Quick Actions / How it Works */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-[var(--color-navy)] mb-2">How It Works</h2>
              <p className="text-[var(--color-secondary)]">Three simple steps to make your city a better place.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="card bg-[var(--color-surface-container-lowest)] flex items-start gap-4 hover:bg-[var(--color-surface-container-low)] transition-colors group">
                <div className="w-12 h-12 rounded-xl bg-[var(--color-surface-container)] flex items-center justify-center text-[var(--color-primary)] shrink-0 group-hover:bg-white transition-colors">
                  <Smartphone size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-[var(--color-navy)] mb-1">Chat to Report</h3>
                  <p className="text-sm text-[var(--color-secondary)]">Tell our AI your issue in Hindi or English. No forms needed.</p>
                </div>
              </div>
              
              <div className="card bg-[var(--color-surface-container-lowest)] flex items-start gap-4 hover:bg-[var(--color-surface-container-low)] transition-colors group">
                <div className="w-12 h-12 rounded-xl bg-[var(--color-surface-container)] flex items-center justify-center text-[var(--color-secondary)] shrink-0 group-hover:bg-white transition-colors">
                  <Zap size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-[var(--color-navy)] mb-1">AI Verifies</h3>
                  <p className="text-sm text-[var(--color-secondary)]">Our AI checks your photo, location and authenticity instantly.</p>
                </div>
              </div>

              <div className="card bg-[var(--color-surface-container-lowest)] flex items-start gap-4 hover:bg-[var(--color-surface-container-low)] transition-colors group sm:col-span-2">
                <div className="w-12 h-12 rounded-xl bg-[var(--color-surface-container)] flex items-center justify-center text-[var(--color-india-green)] shrink-0 group-hover:bg-white transition-colors">
                  <Search size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-[var(--color-navy)] mb-1">Track & Resolve</h3>
                  <p className="text-sm text-[var(--color-secondary)]">Watch your complaint move through departments in real time.</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>


      {/* Community Feed Preview */}
      <section className="py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-[var(--color-navy)] mb-2">Nearby Issues</h2>
              <p className="text-[var(--color-secondary)]">See what's happening in your area.</p>
            </div>
            <Link to="/feed" className="text-[var(--color-primary)] font-bold text-sm hidden sm:block hover:underline">
              View All
            </Link>
          </div>

          <div className="flex overflow-x-auto gap-6 pb-8 snap-x snap-mandatory hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            {(recentComplaints.length > 0 ? recentComplaints : mockComplaints.slice(0, 3)).map(complaint => (
              <div key={complaint._id || complaint.id} className="min-w-[300px] md:min-w-[340px] max-w-[340px] snap-center shrink-0">
                <ComplaintCard complaint={complaint} />
              </div>
            ))}
          </div>
          
          <div className="mt-8 text-center sm:hidden">
             <Link to="/feed" className="btn-primary w-full inline-flex justify-center items-center gap-2">
              View All Complaints <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[var(--color-navy)] text-white pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-12 border-b border-white/10 pb-12">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-[var(--color-primary)] rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-[0_4px_12px_rgba(167,51,0,0.3)]">I247</div>
                <span className="font-bold text-2xl tracking-tight">India247</span>
              </div>
              <p className="text-white/70 text-sm max-w-sm mb-6 leading-relaxed">
                Apna Shehar, Apni Zimmedari. Empowering citizens to build better cities through transparent and accountable civic reporting.
              </p>
              <div className="flex gap-4">
                {/* Social icons placeholders */}
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[var(--color-primary)] hover:scale-110 cursor-pointer transition-all">𝕏</div>
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[var(--color-primary)] hover:scale-110 cursor-pointer transition-all">📷</div>
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[var(--color-primary)] hover:scale-110 cursor-pointer transition-all">in</div>
              </div>
            </div>

            <div>
              <h4 className="font-bold mb-4 text-white">Company</h4>
              <ul className="space-y-3 text-sm text-white/70">
                <li><a href="#" className="hover:text-white transition-colors flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-white/30 hidden"></span>About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-white/30 hidden"></span>Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-white/30 hidden"></span>Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-white/30 hidden"></span>Press</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4 text-white">Legal</h4>
              <ul className="space-y-3 text-sm text-white/70">
                <li><a href="#" className="hover:text-white transition-colors flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-white/30 hidden"></span>Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-white/30 hidden"></span>Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-white/30 hidden"></span>Data Security</a></li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center text-xs text-white/50">
            <p>&copy; 2026 India247. All rights reserved.</p>
            <p className="mt-2 md:mt-0 font-medium">Made with ❤️ for Bharat</p>
          </div>
        </div>
      </footer>

      {/* Floating Chatbot Button & Window - Commented out for now
      <div className="fixed bottom-6 right-6 z-[1000] flex flex-col items-end">
        {isChatOpen && (
          <div className="mb-4 w-80 sm:w-96 bg-white/70 backdrop-blur-2xl border border-white/50 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.2)] rounded-3xl overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300 transform origin-bottom-right">
            <div className="bg-gradient-to-r from-saffron to-[#d64b16] p-4 text-white flex justify-between items-center shadow-md relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl shadow-inner border border-white/30 backdrop-blur-sm">
                  👩‍🦰
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-tight">Meera</h3>
                  <p className="text-[10px] text-orange-100 font-medium tracking-wide uppercase">AI Assistant</p>
                </div>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
                aria-label="Close Chat"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 h-80 overflow-y-auto bg-gray-50/40 flex flex-col gap-4">
              <div className="flex justify-start">
                <div className="bg-white/90 backdrop-blur-md border border-white shadow-sm p-4 rounded-2xl rounded-tl-sm text-sm text-navy font-medium max-w-[85%] animate-in fade-in slide-in-from-left-2 duration-300">
                  Hii. I'm Meera.<br />What assistance do you need today? 😊
                </div>
              </div>
            </div>

            <div className="p-4 bg-white/80 backdrop-blur-xl border-t border-white/50">
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="Type a message..."
                  className="w-full bg-white/90 border border-gray-200/50 rounded-full pl-5 pr-12 py-3 text-sm focus:outline-none focus:border-saffron focus:ring-1 focus:ring-saffron transition-all shadow-inner"
                />
                <button className="absolute right-1.5 w-9 h-9 bg-saffron text-white rounded-full flex items-center justify-center hover:bg-[#d64b16] transition-colors shadow-sm">
                  <Send size={16} className="ml-0.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="group relative">
          {!isChatOpen && (
            <div className="absolute bottom-full right-0 mb-4 w-max opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
              <div className="bg-gray-900/90 backdrop-blur-md text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xl border border-gray-700">
                Chat with our AI assistant - Meera
                <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-gray-900/90 rotate-45 border-r border-b border-gray-700"></div>
              </div>
            </div>
          )}

          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl shadow-[0_10px_25px_-5px_rgba(232,84,26,0.5)] hover:scale-110 transition-all duration-300 z-50 ${isChatOpen
                ? 'bg-gray-100 text-gray-500 shadow-md rotate-90 scale-90 hover:scale-100'
                : 'bg-gradient-to-tr from-saffron to-orange-400 text-white'
              }`}
            style={{
              animation: !isChatOpen ? 'floating 3s ease-in-out infinite' : 'none'
            }}
          >
            {isChatOpen ? <X size={24} /> : '👩‍🦰'}
          </button>

          <style dangerouslySetInnerHTML={{
            __html: `
            @keyframes floating {
              0% { transform: translateY(0px); }
              50% { transform: translateY(-8px); }
              100% { transform: translateY(0px); }
            }
          `}} />
        </div>
      </div>
      */}
    </div>
  );
};

export default LandingPage;
