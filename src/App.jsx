import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import SmoothScroll from './components/layout/SmoothScroll';
import ScrollToTop from './components/layout/ScrollToTop';
import Layout from './components/layout/Layout';
import EntryAnimation from './components/EntryAnimation';
import { useState, useEffect, useCallback } from 'react';

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
  const { isAuthenticated, isSuspended, isLoading, logout } = useAuth();
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);

  // Timeout loading after 3 seconds - prevent infinite loading
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        console.warn('⚠️ ProtectedRoute loading timeout - proceeding without auth check');
        setLoadingTimedOut(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  // Show loading for max 3 seconds
  if (isLoading && !loadingTimedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          className="w-12 h-12 rounded-full border-2 animate-spin"
          style={{
            borderColor: 'rgba(201, 162, 39, 0.2)',
            borderTopColor: '#c9a227'
          }}
        />
      </div>
    );
  }

  // Handle suspended users
  if (isAuthenticated && isSuspended) {
    console.warn('🚫 Access denied: User is suspended');
    // The AuthContext will handle the logout, but we should clear the view immediately
    return <Navigate to="/login" replace />;
  }

  // If requireAuth is false or timed out, don't redirect
  if (requireAuth && !isAuthenticated && !loadingTimedOut) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// ADMIN PROTECTED ROUTE - Only allows admin users
function AdminProtectedRoute({ children }) {
  const { isAuthenticated, isSuspended, isAdmin, isLoading, user } = useAuth();
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);

  // Timeout loading after 4 seconds
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        console.warn('⚠️ AdminProtectedRoute loading timeout');
        setLoadingTimedOut(true);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  // Show loading spinner while checking auth
  if (isLoading && !loadingTimedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center">
          <div
            className="w-12 h-12 mx-auto rounded-full border-2 animate-spin"
            style={{
              borderColor: 'rgba(16, 185, 129, 0.2)',
              borderTopColor: '#10b981'
            }}
          />
          <p className="mt-4 text-zinc-400 text-sm">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated && !loadingTimedOut) {
    return <Navigate to="/login" replace />;
  }

  // Handle suspended users
  if (isAuthenticated && isSuspended) {
    console.warn('🚫 Access denied: Account is suspended');
    return <Navigate to="/login" replace />;
  }

  // Not admin - show access denied and redirect
  if (!isAdmin) {
    console.warn('🚫 Admin access denied:', {
      email: user?.email,
      role: user?.app_metadata?.role || user?.user_metadata?.role || 'none'
    });

    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-zinc-400 mb-6">
            You don't have permission to access the administrative area.
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Admin verified - render children
  return children;
}

// SUBSCRIBED-ONLY ROUTE - Redirects non-subscribers to pricing
function SubscribedRoute({ children }) {
  const { isAuthenticated, isSuspended, isSubscribed, isLoading } = useAuth();
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);

  // Timeout loading after 3 seconds
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setLoadingTimedOut(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  // Show loading while checking
  if (isLoading && !loadingTimedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          className="w-12 h-12 rounded-full border-2 animate-spin"
          style={{
            borderColor: 'rgba(201, 162, 39, 0.2)',
            borderTopColor: '#c9a227'
          }}
        />
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated && !loadingTimedOut) {
    return <Navigate to="/login" replace />;
  }

  // Handle suspended users
  if (isAuthenticated && isSuspended) {
    console.warn('🚫 Access denied: Account is suspended');
    return <Navigate to="/login" replace />;
  }

  // Authenticated but not subscribed - redirect to pricing
  if (!isSubscribed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-yellow-500/10 flex items-center justify-center">
            <svg className="w-10 h-10 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Subscription Required</h1>
          <p className="text-zinc-400 mb-6">
            You need an active subscription to access this feature. Subscribe now to start playing!
          </p>
          <a
            href="/pricing"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-medium rounded-xl transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            View Plans
          </a>
        </div>
      </div>
    );
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Main Layout */}
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
        <Route path="complete-setup" element={
          <ProtectedRoute>
            <CompleteSetup />
          </ProtectedRoute>
        } />

        {/* Protected User Routes - Require subscription */}
        <Route path="dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="scores" element={
          <ProtectedRoute>
            <Scores />
          </ProtectedRoute>
        } />

        {/* Profile Routes */}
        <Route path="profile/settings" element={
          <ProtectedRoute>
            <ProfileSettings />
          </ProtectedRoute>
        } />
        <Route path="profile/charity" element={
          <ProtectedRoute>
            <MyCharity />
          </ProtectedRoute>
        } />
        <Route path="profile/winnings" element={
          <ProtectedRoute>
            <MyWinnings />
          </ProtectedRoute>
        } />
        {/* Redirect old subscription route to pricing */}
        <Route path="profile/subscription" element={<Navigate to="/pricing" replace />} />

        {/* Admin Routes - PROTECTED: Admin only */}
        <Route path="admin" element={
          <AdminProtectedRoute>
            <AdminDashboard />
          </AdminProtectedRoute>
        } />
        <Route path="admin/draw" element={
          <AdminProtectedRoute>
            <DrawControl />
          </AdminProtectedRoute>
        } />
        <Route path="admin/users" element={
          <AdminProtectedRoute>
            <UserManagement />
          </AdminProtectedRoute>
        } />
        <Route path="admin/charities" element={
          <AdminProtectedRoute>
            <CharityManagement />
          </AdminProtectedRoute>
        } />
        <Route path="admin/charities/add" element={
          <AdminProtectedRoute>
            <CharityEditor />
          </AdminProtectedRoute>
        } />
        <Route path="admin/charities/edit/:id" element={
          <AdminProtectedRoute>
            <CharityEditor />
          </AdminProtectedRoute>
        } />
        <Route path="admin/draws" element={
          <AdminProtectedRoute>
            <DrawManagement />
          </AdminProtectedRoute>
        } />
        <Route path="admin/content" element={
          <AdminProtectedRoute>
            <ContentManagement />
          </AdminProtectedRoute>
        } />
        <Route path="admin/reports" element={
          <AdminProtectedRoute>
            <AdminReports />
          </AdminProtectedRoute>
        } />
        <Route path="admin/finance" element={
          <AdminProtectedRoute>
            <FinancePayouts />
          </AdminProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

function App() {
  // Show entry animation only once per session
  const [showEntryAnimation, setShowEntryAnimation] = useState(() => {
    // 1. Get navigation type - helps distinguish fresh loads vs reloads
    const navType = typeof window !== 'undefined' && window.performance
      ? window.performance.getEntriesByType('navigation')[0]?.type
      : 'navigate';

    // 2. Check if animation has already played in this session (tab)
    let played = sessionStorage.getItem('entryAnimationPlayed');

    // 🚀 LOGIC FIX: If it's a 'navigate' but played exists, it means we cloned a tab.
    // The user wants fresh tabs to play the animation once.
    if (navType === 'navigate' && (played === 'true' || played === 'pending')) {
      console.log('🔄 App: Fresh navigation in new tab (likely cloned). Re-enabling animation.');
      sessionStorage.removeItem('entryAnimationPlayed');
      played = null;
    }

    // Default to false if already played (or started) to fulfill "no replay on reload" rule
    if (played === 'true' || played === 'pending') {
      // Ensure it's marked as 'true' so Home.jsx skips its internal timer
      if (played === 'pending') sessionStorage.setItem('entryAnimationPlayed', 'true');
      return false;
    }

    // Also check if we are on a login or join page - we skip animation there
    const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/signup';
    if (isAuthPage) return false;

    // If we've decided to show it, set the flag immediately to prevent re-play on accidental reload
    sessionStorage.setItem('entryAnimationPlayed', 'pending');
    return true;
  });

  const handleAnimationComplete = useCallback(() => {
    console.log('✅ App: Entry animation complete notification received');
    sessionStorage.setItem('entryAnimationPlayed', 'true');
    setShowEntryAnimation(false);
  }, []);

  // Safety Effect: Ensure animation is cleared if storage key exists
  useEffect(() => {
    const played = sessionStorage.getItem('entryAnimationPlayed');
    if (played === 'true' && showEntryAnimation) {
      console.log('🛡️ App Safety: Clearing stuck entry animation state');
      setShowEntryAnimation(false);
    }
  }, [showEntryAnimation]);

  return (
    <ToastProvider>
      <AuthProvider>
        <SmoothScroll>
          {/* Scroll to top on route change */}
          <ScrollToTop />
          {/* Cinematic Entry Animation - Disabled to fix black screen issues */}
          {/* {showEntryAnimation && (
            <EntryAnimation onComplete={handleAnimationComplete} />
          )} */}
          <AppRoutes />
        </SmoothScroll>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
