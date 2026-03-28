import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut(auth);
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

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Map', path: '/map' },
    { name: 'Feed', path: '/feed' },
    { name: 'Tracker', path: '/tracker' },
    { name: 'Rewards', path: '/rewards' },
    { name: 'Officer Dashboard', path: '/officer' }
  ];

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
      isScrolled ? 'bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100' : 'bg-transparent'
    }`}>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-saffron rounded-full flex items-center justify-center text-white font-bold text-sm">
                I247
              </div>
              <div>
                <span className="font-bold text-navy text-xl hidden sm:block">India247</span>
              </div>
            </Link>
            <span className="text-xs text-gray-500 hidden md:inline ml-2 border-l border-gray-300 pl-2">
              Apna Shehar, Apni Zimmedari
            </span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
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
            
            <div className="text-sm font-semibold text-gray-500 cursor-pointer hover:text-navy mr-4">
              EN | हिंदी
            </div>

            {user ? (
              <button onClick={handleLogout} className="btn-outline py-2 px-4 text-sm hover:-translate-y-0.5 transition-transform">
                Logout
              </button>
            ) : (
              <Link to="/auth" className="btn-outline py-2 px-4 text-sm hover:-translate-y-0.5 transition-transform">
                Login
              </Link>
            )}

            <Link to="/report" className="btn-primary py-2 px-5 text-sm shadow-md hover:-translate-y-0.5 transition-transform">
              Report Issue
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-navy p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-100 shadow-lg animate-in slide-in-from-top-2">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  location.pathname === link.path 
                    ? 'bg-orange-50 text-saffron' 
                    : 'text-gray-700 hover:bg-gray-50 hover:text-navy'
                }`}
              >
                {link.name}
              </Link>
            ))}
             {user ? (
              <button 
                onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                className="block w-full text-center mt-2 border border-gray-300 text-gray-700 rounded-xl px-4 py-2.5 font-semibold"
              >
                Logout
              </button>
            ) : (
              <Link 
                to="/auth" 
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center mt-2 border border-gray-300 text-gray-700 rounded-xl px-4 py-2.5 font-semibold"
              >
                Login
              </Link>
            )}
            <Link 
              to="/report" 
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-center mt-4 bg-saffron text-white rounded-xl px-4 py-2.5 font-semibold"
            >
              Report Issue
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
