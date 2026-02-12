import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import SmoothScroll from './components/layout/SmoothScroll';
import ScrollToTop from './components/layout/ScrollToTop';
import Layout from './components/layout/Layout';
import EntryAnimation from './components/EntryAnimation';
import { useState, useEffect, useCallback } from 'react';
import { SiteContentProvider } from './hooks/useSiteContent';
import { DataProvider } from './context/DataContext';

// Pages
import Home from './pages/Home';
import About from './pages/About';
import HowItWorks from './pages/HowItWorks';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Scores from './pages/Scores';
import Charities from './pages/Charities';
import Results from './pages/Results';
import AdminDashboard from './pages/admin/AdminDashboard';
import DrawControl from './pages/admin/DrawControl';
import UserManagement from './pages/admin/UserManagement';
import CharityManagement from './pages/admin/CharityManagement';
import AddCharity from './pages/admin/AddCharity';
import CharityEditor from './pages/admin/CharityEditor';
import DrawManagement from './pages/admin/DrawManagement';
import ContentManagement from './pages/admin/ContentManagement';
import AdminReports from './pages/admin/AdminReports';
import FinancePayouts from './pages/admin/FinancePayouts';
import ContactInquiries from './pages/admin/ContactInquiries';
import ProfileSettings from './pages/profile/ProfileSettings';
import MyCharity from './pages/profile/MyCharity';
import MyWinnings from './pages/profile/MyWinnings';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Pricing from './pages/Pricing';
import FAQ from './pages/FAQ';
import Contact from './pages/Contact';
import Impact from './pages/Impact';
import Events from './pages/Events';
import Donate from './pages/Donate';
import CompleteSetup from './pages/CompleteSetup';

// Protected Route Component with loading timeout
function ProtectedRoute({ children, requireAuth = true }) {
  const { isAuthenticated, isSuspended, isLoading } = useAuth();
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);

  // Timeout loading after 4 seconds - reduced from 5 for faster feel
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setLoadingTimedOut(true);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (isLoading && !loadingTimedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
      </div>
    );
  }

  if (isAuthenticated && isSuspended) return <Navigate to="/login" replace />;
  if (requireAuth && !isAuthenticated && !loadingTimedOut) return <Navigate to="/login" replace />;

  return children;
}

// ADMIN PROTECTED ROUTE
function AdminProtectedRoute({ children }) {
  const { isAuthenticated, isSuspended, isAdmin, isLoading, user } = useAuth();
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setLoadingTimedOut(true);
      }, 5000); // 5 seconds max
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (isLoading && !loadingTimedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="w-12 h-12 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated && !loadingTimedOut) return <Navigate to="/login" replace />;
  if (isAuthenticated && isSuspended) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        {/* Public Routes */}
        <Route index element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="login" element={<Auth />} />
        <Route path="signup" element={<Auth />} />
        <Route path="how-it-works" element={<HowItWorks />} />
        <Route path="charities" element={<Charities />} />
        <Route path="results" element={<Results />} />
        <Route path="terms" element={<Terms />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="pricing" element={<Pricing />} />
        <Route path="faq" element={<FAQ />} />
        <Route path="contact" element={<Contact />} />
        <Route path="impact" element={<Impact />} />
        <Route path="events" element={<Events />} />
        <Route path="donate" element={<Donate />} />
        <Route path="complete-setup" element={<ProtectedRoute><CompleteSetup /></ProtectedRoute>} />

        {/* User Routes */}
        <Route path="dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="scores" element={<ProtectedRoute><Scores /></ProtectedRoute>} />
        <Route path="profile/settings" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
        <Route path="profile/charity" element={<ProtectedRoute><MyCharity /></ProtectedRoute>} />
        <Route path="profile/winnings" element={<ProtectedRoute><MyWinnings /></ProtectedRoute>} />
        <Route path="profile/subscription" element={<Navigate to="/pricing" replace />} />

        {/* Admin Routes */}
        <Route path="admin" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
        <Route path="admin/draw" element={<AdminProtectedRoute><DrawControl /></AdminProtectedRoute>} />
        <Route path="admin/users" element={<AdminProtectedRoute><UserManagement /></AdminProtectedRoute>} />
        <Route path="admin/charities" element={<AdminProtectedRoute><CharityManagement /></AdminProtectedRoute>} />
        <Route path="admin/charities/add" element={<AdminProtectedRoute><CharityEditor /></AdminProtectedRoute>} />
        <Route path="admin/charities/edit/:id" element={<AdminProtectedRoute><CharityEditor /></AdminProtectedRoute>} />
        <Route path="admin/draws" element={<AdminProtectedRoute><DrawManagement /></AdminProtectedRoute>} />
        <Route path="admin/content" element={<AdminProtectedRoute><ContentManagement /></AdminProtectedRoute>} />
        <Route path="admin/reports" element={<AdminProtectedRoute><AdminReports /></AdminProtectedRoute>} />
        <Route path="admin/finance" element={<AdminProtectedRoute><FinancePayouts /></AdminProtectedRoute>} />
        <Route path="admin/inquiries" element={<AdminProtectedRoute><ContactInquiries /></AdminProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

function App() {
  const [showEntryAnimation, setShowEntryAnimation] = useState(() => {
    const navType = typeof window !== 'undefined' && window.performance
      ? window.performance.getEntriesByType('navigation')[0]?.type
      : 'navigate';

    let played = sessionStorage.getItem('entryAnimationPlayed');

    if (navType === 'navigate' && (played === 'true' || played === 'pending')) {
      sessionStorage.removeItem('entryAnimationPlayed');
      played = null;
    }

    if (played === 'true' || played === 'pending') {
      if (played === 'pending') sessionStorage.setItem('entryAnimationPlayed', 'true');
      return false;
    }

    const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/signup';
    if (isAuthPage) return false;

    sessionStorage.setItem('entryAnimationPlayed', 'pending');
    return true;
  });

  const handleAnimationComplete = useCallback(() => {
    sessionStorage.setItem('entryAnimationPlayed', 'true');
    setShowEntryAnimation(false);
  }, []);

  useEffect(() => {
    const played = sessionStorage.getItem('entryAnimationPlayed');
    if (played === 'true' && showEntryAnimation) {
      setShowEntryAnimation(false);
    }
  }, [showEntryAnimation]);

  return (
    <ToastProvider>
      <AuthProvider>
        <SiteContentProvider>
          <DataProvider>
            <SmoothScroll>
              <ScrollToTop />
              {showEntryAnimation && (
                <EntryAnimation onComplete={handleAnimationComplete} />
              )}
              <AppRoutes />
            </SmoothScroll>
          </DataProvider>
        </SiteContentProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
