import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate, Link } from 'react-router-dom';
import { Home, Compass, Plus, Bell, Trophy } from 'lucide-react';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import ReportPage from './pages/ReportPage';
import MapPage from './pages/MapPage';
import FeedPage from './pages/FeedPage';
import TrackerPage from './pages/TrackerPage';
import RewardsPage from './pages/RewardsPage';
import OfficerDashboard from './pages/OfficerDashboard';
import AuthPage from './pages/AuthPage';
import { useAuth } from './context/AuthContext';

// Simple scroll to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  
  // Show a blank or loading screen before redirecting if auth context is still initializing
  if (loading) return null; 

  if (!user) return <Navigate to="/auth" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" />;
  return children;
};


// Simple bottom nav for mobile
const BottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();
  
  if(!user || user.role === 'officer' || location.pathname === '/officer') return null;

  const navLinks = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Explore', path: '/map', icon: Compass },
    { name: 'Report', path: '/report', icon: Plus, isAction: true },
    { name: 'Activity', path: '/feed', icon: Bell },
    { name: 'Rewards', path: '/rewards', icon: Trophy }
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 flex justify-around items-center px-2 py-3 z-[999] shadow-[0_-8px_20px_rgba(0,0,0,0.03)] pb-safe">
      {navLinks.map(link => {
        const Icon = link.icon;
        const isActive = location.pathname === link.path;
        
        if (link.isAction) {
          return (
            <Link 
              key={link.name} 
              to={link.path}
              className="flex flex-col items-center justify-center -mt-10"
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-[0_4px_12px_rgba(167,51,0,0.3)] transition-all active:scale-90 ${
                isActive ? 'bg-saffron text-white' : 'bg-navy text-white'
              }`}>
                <Plus size={32} />
              </div>
              <span className={`text-[10px] font-bold mt-1.5 ${isActive ? 'text-saffron' : 'text-navy'}`}>
                {link.name}
              </span>
            </Link>
          );
        }

        return (
          <Link 
            key={link.name} 
            to={link.path}
            className={`relative flex flex-col items-center justify-center py-2 px-1 w-16 transition-all duration-300 ${
              isActive ? 'text-saffron' : 'text-gray-400'
            }`}
          >
            {isActive && (
              <span className="absolute inset-x-0 -top-1 mx-auto w-8 h-1 bg-saffron rounded-full animate-in fade-in slide-in-from-top-1"></span>
            )}
            <div className={`p-2 rounded-2xl transition-colors duration-300 ${isActive ? 'bg-orange-50' : 'bg-transparent'}`}>
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className={`text-[10px] font-bold mt-1 uppercase tracking-tighter ${isActive ? 'opacity-100' : 'opacity-60'}`}>
              {link.name}
            </span>
          </Link>
        );
      })}
    </div>
  );
};

function App() {
  return (
    <Router>
      <ScrollToTop />
      <div className="min-h-screen bg-background text-gray-800 font-sans flex flex-col">
        <Navbar />
        <main className="flex-1 w-full relative">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/report" element={<ProtectedRoute allowedRoles={['user']}><ReportPage /></ProtectedRoute>} />
            <Route path="/map" element={<ProtectedRoute allowedRoles={['user', 'officer']}><MapPage /></ProtectedRoute>} />
            <Route path="/feed" element={<ProtectedRoute allowedRoles={['user']}><FeedPage /></ProtectedRoute>} />
            <Route path="/tracker" element={<ProtectedRoute allowedRoles={['user']}><TrackerPage /></ProtectedRoute>} />
            <Route path="/rewards" element={<ProtectedRoute allowedRoles={['user']}><RewardsPage /></ProtectedRoute>} />
            <Route path="/officer" element={<ProtectedRoute allowedRoles={['officer']}><OfficerDashboard /></ProtectedRoute>} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </Router>
  );
}

export default App;
