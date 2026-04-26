import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, Star, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [profilePopupOpen, setProfilePopupOpen] = useState(false);
  const [points, setPoints] = useState(0);
  const location = useLocation();
  const { user } = useAuth();
  
  const isReportPage = location.pathname === '/report';

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setProfilePopupOpen(false);
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch points if user is logged in (for the profile popup)
  useEffect(() => {
    if (user && user.role !== 'officer') {
      fetch(`https://api.india247.shashankraj.in/api/complaints/user/points/${encodeURIComponent(user.name)}`)
        .then(res => res.json())
        .then(data => setPoints(data.points || 0))
        .catch(err => console.error("Failed to fetch points in navbar", err));
    }
  }, [user]);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Map', path: '/map', roles: ['user', 'officer'] },
    { name: 'Feed', path: '/feed', roles: ['user'] },
    { name: 'Tracker', path: '/tracker', roles: ['user'] },
    { name: 'Rewards', path: '/rewards', roles: ['user'] },
    { name: 'Officer Dashboard', path: '/officer', roles: ['officer'] }
  ];

  const visibleLinks = navLinks.filter(link => {
    if (user?.role === 'officer') return false;
    if (link.name === 'Home') return true;
    if (!user) return false;
    return link.roles.includes(user.role);
  });

  const userName = user?.name || "Citizen";
  const words = userName.trim().split(/\s+/);
  const initials = words.length >= 2 
    ? (words[0][0] + words[1][0]).toUpperCase() 
    : (words[0]?.[0] || 'C').toUpperCase();

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
      isScrolled || isReportPage ? 'bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100' : 'bg-transparent'
    }`}>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            {isReportPage ? (
              <Link to="/" className="flex items-center gap-2 p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
                <ArrowLeft size={24} className="text-navy" />
                <span className="font-bold text-navy hidden sm:inline">Back</span>
              </Link>
            ) : (
              <Link to="/" className="flex items-center gap-2 group">
                <div className="w-8 h-8 bg-saffron rounded-full flex items-center justify-center text-white font-bold text-sm hidden sm:flex shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                  I247
                </div>
                <div>
                  <span className="font-bold text-navy text-xl">India247</span>
                </div>
              </Link>
            )}
            {!isReportPage && (
              <span className="text-xs text-gray-500 hidden md:inline ml-2 border-l border-gray-300 pl-2">
                Apna Shehar, Apni Zimmedari
              </span>
            )}
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-6">
            {visibleLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={`text-sm font-medium transition-colors ${
                  location.pathname === link.path ? 'text-saffron' : 'text-navy hover:text-saffron'
                }`}
              >
                {link.name}
              </Link>
            ))}
            
            {/* 
            <div className="text-sm font-semibold text-gray-500 cursor-pointer hover:text-navy mr-4">
              EN | हिंदी
            </div>
            */}

            {user ? (
              <button onClick={handleLogout} className="btn-outline py-2 px-4 text-sm hover:-translate-y-0.5 transition-transform">
                Logout
              </button>
            ) : (
              <Link to="/auth" className="btn-outline py-2 px-4 text-sm hover:-translate-y-0.5 transition-transform">
                Login
              </Link>
            )}

            {(!user || user.role !== 'officer') && (
              <Link to="/report" className="btn-primary py-2 px-5 text-sm shadow-md hover:-translate-y-0.5 transition-transform">
                Report Issue
              </Link>
            )}
          </div>

          {/* Mobile Profile Toggle */}
          <div className="md:hidden flex items-center relative">
            {user ? (
              <button
                onClick={() => setProfilePopupOpen(!profilePopupOpen)}
                className="w-10 h-10 bg-saffron rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md border-2 border-white focus:outline-none focus:ring-2 focus:ring-saffron/50 transition-all active:scale-90"
              >
                {initials}
              </button>
            ) : (
              <Link to="/auth" className="text-saffron font-bold text-sm border-2 border-saffron rounded-full px-4 py-1.5 hover:bg-saffron hover:text-white transition-all">
                Login
              </Link>
            )}

            {/* Glassmorphism Profile Popup */}
            {profilePopupOpen && user && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setProfilePopupOpen(false)}
                ></div>
                <div className="absolute top-14 right-0 w-64 bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] p-5 z-50 animate-in fade-in slide-in-from-top-2 zoom-in-95 duration-200 origin-top-right">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-saffron rounded-full flex items-center justify-center text-white font-bold text-lg border-2 border-white shadow-sm">
                      {initials}
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-bold text-navy truncate">{userName}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                  </div>

                  {user.role !== 'officer' && (
                    <div className="bg-white/50 rounded-xl p-3 mb-4 border border-white/50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Star size={16} className="text-accent-gold fill-accent-gold" />
                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Rewards</span>
                      </div>
                      <span className="font-black text-navy">{points.toLocaleString()} pts</span>
                    </div>
                  )}

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 transition-colors"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
