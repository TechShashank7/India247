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
import { Link } from 'react-router-dom';
import { Shield, Smartphone, Zap, MapPin, Search, X, Send } from 'lucide-react';
import ComplaintCard from '../components/ComplaintCard';
import { mockComplaints } from '../data/mockData';

const LandingPage = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);

  const categories = [
    { name: 'Roads & Potholes', icon: '🕳️', bg: 'bg-orange-50' },
    { name: 'Garbage & Sanitation', icon: '🗑️', bg: 'bg-green-50' },
    { name: 'Water & Sewage', icon: '💧', bg: 'bg-blue-50' },
    { name: 'Streetlights', icon: '💡', bg: 'bg-yellow-50' },
    { name: 'Parks', icon: '🌳', bg: 'bg-emerald-50' },
    { name: 'Public Safety', icon: '🚨', bg: 'bg-red-50' },
  ];

  return (
    <div className="pt-20">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 animate-in fade-in duration-700">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl md:text-6xl font-black text-navy leading-tight mb-6 flex flex-col">
              <span>Report.</span>
              <span>Track.</span>
              <span className="text-saffron">Resolve.</span>
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-lg leading-relaxed">
              India's smartest civic complaint platform. File a complaint in 60 seconds using our AI-powered chat — in your language, from your phone.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Link to="/report" className="btn-primary text-center">
                Report an Issue
              </Link>
              <Link to="/map" className="btn-secondary text-center bg-gray-100 !text-navy hover:!bg-gray-200">
                View Live Map
              </Link>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
              <Shield size={16} className="text-india-green" />
              <span>Your identity stays protected. Always.</span>
            </div>
          </div>

          {/* Phone Mockup Frame */}
          <div className="relative mx-auto w-full max-w-[320px] aspect-[9/19] bg-white rounded-[3rem] shadow-2xl border-[8px] border-gray-900 overflow-hidden transform md:rotate-2 hover:rotate-0 transition-transform duration-500">
            {/* Notch */}
            <div className="absolute top-0 inset-x-0 h-6 bg-gray-900 w-32 mx-auto rounded-b-3xl z-20"></div>

            <div className="bg-gray-50 h-full p-4 pt-10 flex flex-col gap-4 overflow-hidden relative">

              <div className="flex justify-start">
                <div className="bg-white border border-gray-100 p-3 rounded-2xl rounded-tl-sm shadow-sm max-w-[85%] text-xs font-medium text-navy">
                  Namaste! What civic issue are you facing today? 🙏
                </div>
              </div>

              <div className="flex justify-end">
                <div className="bg-saffron text-white p-3 rounded-2xl rounded-tr-sm shadow-sm max-w-[85%] text-xs font-medium">
                  There's a big pothole near my house
                </div>
              </div>

              <div className="flex justify-start">
                <div className="bg-white border border-gray-100 p-3 rounded-2xl rounded-tl-sm shadow-sm max-w-[85%] text-xs font-medium text-navy">
                  Got it! I've detected this as a Road issue. Can you share a photo?
                </div>
              </div>

              <div className="flex justify-end">
                <div className="bg-saffron text-white p-3 rounded-2xl rounded-tr-sm shadow-sm text-xs font-medium">
                  [Photo uploaded ✓]
                </div>
              </div>

              <div className="flex justify-start">
                <div className="bg-white border-2 border-green-100 p-3 rounded-2xl rounded-tl-sm shadow-sm max-w-[85%] text-xs font-medium text-india-green bg-green-50">
                  ✅ AI verified! Complaint filed.<br />Tracking ID: IND-2026-04821
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-white border-y border-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-gray-100">
            <div className="text-center px-4 hover:-translate-y-1 transition-transform">
              <div className="text-3xl md:text-4xl font-extrabold text-saffron mb-2"><CountUp end={14283} /></div>
              <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Complaints Filed</div>
            </div>
            <div className="text-center px-4 hover:-translate-y-1 transition-transform">
              <div className="text-3xl md:text-4xl font-extrabold text-india-green mb-2"><CountUp end={10941} /></div>
              <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Issues Resolved</div>
            </div>
            <div className="text-center px-4 hover:-translate-y-1 transition-transform">
              <div className="text-3xl md:text-4xl font-extrabold text-navy mb-2"><CountUp end={342} /></div>
              <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Active Wards</div>
            </div>
            <div className="text-center px-4 hover:-translate-y-1 transition-transform">
              <div className="text-3xl md:text-4xl font-extrabold text-accent-gold mb-2"><CountUp end={91} />%</div>
              <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Citizen Satisfaction</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-navy mb-4">How It Works</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">Three simple steps to make your city a better place.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="card text-center hover:shadow-lg transition-shadow border border-gray-50">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 text-saffron">
                <Smartphone size={32} />
              </div>
              <h3 className="text-xl font-bold mb-3">🗣️ Chat to Report</h3>
              <p className="text-gray-600 text-sm">Tell our AI your issue in Hindi or English. No forms, no confusion.</p>
            </div>

            <div className="card text-center hover:shadow-lg transition-shadow border border-gray-50">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600">
                <Zap size={32} />
              </div>
              <h3 className="text-xl font-bold mb-3">🤖 AI Verifies</h3>
              <p className="text-gray-600 text-sm">Our AI checks your photo, location and complaint authenticity instantly.</p>
            </div>

            <div className="card text-center hover:shadow-lg transition-shadow border border-gray-50">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-india-green">
                <Search size={32} />
              </div>
              <h3 className="text-xl font-bold mb-3">✅ Track & Resolve</h3>
              <p className="text-gray-600 text-sm">Watch your complaint move through departments in real time.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Issue Categories */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-3xl font-bold text-navy mb-2">Issue Categories</h2>
              <p className="text-gray-500">Select an issue to report instantly.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {categories.map((cat, i) => (
              <div key={i} className={`${cat.bg} rounded-2xl p-6 hover:-translate-y-1 transition-transform cursor-pointer group`}>
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">{cat.icon}</div>
                <h3 className="font-bold text-navy mb-4">{cat.name}</h3>
                <Link to="/report" className="text-sm font-semibold text-saffron flex items-center gap-1 group-hover:gap-2 transition-all">
                  Report Now <span>→</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Community Feed Preview */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-navy mb-4">What's happening in your area</h2>
            <p className="text-gray-500">Join citizens making a difference across the nation.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {mockComplaints.slice(0, 3).map(complaint => (
              <ComplaintCard key={complaint.id} complaint={complaint} />
            ))}
          </div>

          <div className="text-center">
            <Link to="/feed" className="inline-block text-navy font-semibold hover:text-saffron transition-colors border-b-2 border-navy hover:border-saffron pb-1">
              See all complaints →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy text-white pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-12 border-b border-gray-700 pb-12">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-saffron rounded-full flex items-center justify-center text-white font-bold text-xs">I247</div>
                <span className="font-bold text-xl">India247</span>
              </div>
              <p className="text-gray-400 text-sm max-w-sm mb-6">
                Apna Shehar, Apni Zimmedari. Empowering citizens to build better cities through transparent and accountable civic reporting.
              </p>
              <div className="flex gap-4">
                {/* Social icons placeholders */}
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-saffron cursor-pointer transition-colors">𝕏</div>
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-saffron cursor-pointer transition-colors">📷</div>
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-saffron cursor-pointer transition-colors">in</div>
              </div>
            </div>

            <div>
              <h4 className="font-bold mb-4 text-gray-200">Company</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Press</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4 text-gray-200">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Data Security</a></li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center text-xs text-gray-500">
            <p>&copy; 2026 India247. All rights reserved.</p>
            <p className="mt-2 md:mt-0 font-medium text-gray-400">Made with ❤️ for Bharat</p>
          </div>
        </div>
      </footer>

      {/* Floating Chatbot Button & Window */}
      <div className="fixed bottom-6 right-6 z-[1000] flex flex-col items-end">
        {/* Chatbot Window */}
        {isChatOpen && (
          <div className="mb-4 w-80 sm:w-96 bg-white/70 backdrop-blur-2xl border border-white/50 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.2)] rounded-3xl overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300 transform origin-bottom-right">
            {/* Chatbot Header */}
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

            {/* Chatbot Body */}
            <div className="p-5 h-80 overflow-y-auto bg-gray-50/40 flex flex-col gap-4">
              <div className="flex justify-start">
                <div className="bg-white/90 backdrop-blur-md border border-white shadow-sm p-4 rounded-2xl rounded-tl-sm text-sm text-navy font-medium max-w-[85%] animate-in fade-in slide-in-from-left-2 duration-300">
                  Hii. I'm Meera.<br />What assistance do you need today? 😊
                </div>
              </div>
            </div>

            {/* Chatbot Input */}
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

        {/* Floating Button */}
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
    </div>
  );
};

export default LandingPage;
