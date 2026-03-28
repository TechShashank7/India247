import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
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

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" />;
  return children;
};

// Simple bottom nav for mobile
const BottomNav = () => {
  const location = useLocation();
  const navLinks = [
    { name: 'Home', path: '/', icon: '🏠' },
    { name: 'Report', path: '/report', icon: '📸' },
    { name: 'Map', path: '/map', icon: '🗺️' },
    { name: 'Feed', path: '/feed', icon: '📱' },
    { name: 'Rewards', path: '/rewards', icon: '🎁' }
  ];

  if(location.pathname === '/officer') return null;

  return (
    <div className="md:hidden fixed bottom-0 w-full bg-white border-t border-gray-100 flex justify-around items-center p-2 z-[999] shadow-[0_-4px_10px_rgba(0,0,0,0.05)] pb-safe">
      {navLinks.map(link => (
        <a 
          key={link.name} 
          href={link.path}
          className={`flex flex-col items-center justify-center p-2 w-16 transition-colors ${
            location.pathname === link.path ? 'text-saffron scale-110' : 'text-gray-400 hover:text-navy'
          }`}
        >
          <span className="text-xl mb-1">{link.icon}</span>
          <span className="text-[10px] font-bold">{link.name}</span>
        </a>
      ))}
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
            <Route path="/report" element={<ProtectedRoute><ReportPage /></ProtectedRoute>} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/feed" element={<FeedPage />} />
            <Route path="/tracker" element={<ProtectedRoute><TrackerPage /></ProtectedRoute>} />
            <Route path="/rewards" element={<ProtectedRoute><RewardsPage /></ProtectedRoute>} />
            <Route path="/officer" element={<OfficerDashboard />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </Router>
  );
}

export default App;
