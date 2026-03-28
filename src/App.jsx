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
  const navLinks = [
    { name: 'Home', path: '/', icon: '🏠' },
    { name: 'Report', path: '/report', icon: '📸' },
    { name: 'Map', path: '/map', icon: '🗺️' },
    { name: 'Feed', path: '/feed', icon: '📱' },
    { name: 'Rewards', path: '/rewards', icon: '🎁' }
  ];

  const { user } = useAuth();

  if(!user || user.role === 'officer' || location.pathname === '/officer') return null;

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
