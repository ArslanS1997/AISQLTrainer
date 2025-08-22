import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LandingPage } from './pages/LandingPage';
import PricingPage from './pages/PricingPage';
import { MainPage } from './pages/MainPage';

import { CompetitionPage } from './pages/CompetitionPage';
import { Navbar } from './components/Navbar';
import './index.css';
import CertificatePage from './pages/CertificatePage';
import { AchievementsPage } from './pages/AchievementPage';
import { SubscriptionPage } from './pages/SubscriptionPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import { UpgradeProvider } from './contexts/UpgradeContext';
import { GlobalUpgradeModal } from './components/GlobalUpgradeModal';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { useSubscriptionUpdate } from './utils/useSubscriptionUpdate';
import PaymentFailurePage from './pages/PaymentFailurePage';


const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  return user ? <>{children}</> : <Navigate to="/" replace />;
};

const AuthRedirectHandler: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If user just logged in and we're on the landing page, redirect to practice
    if (user && window.location.pathname === '/') {
      navigate('/compete', { replace: true });
    }
  }, [user, navigate]);

  return null;
};

const AppRoutes: React.FC = () => {
  const { user } = useAuth();
  
  return (
    <>
      <AuthRedirectHandler />
      {user && <Navbar />}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route 
          path="/practice" 
          element={
            <ProtectedRoute>
              <MainPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/achievements" 
          element={
            <ProtectedRoute>
              <AchievementsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/compete" 
          element={
            <ProtectedRoute>
              <CompetitionPage />
            </ProtectedRoute>
          } 
        />
        {/* ADD THIS ROUTE FOR /certificate (no params) BEFORE THE :sessionId ROUTE */}
        <Route
          path="/certificate"
          element={
            <ProtectedRoute>
              <CertificatePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/certificate/:sessionId"
          element={
            <ProtectedRoute>
              <CertificatePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/subscription"
          element={
            <ProtectedRoute>
              <SubscriptionPage />
            </ProtectedRoute>
          }
        />
        <Route path="/payment-success" element={<PaymentSuccessPage />} />
        <Route path="/subscription/success" element={<PaymentSuccessPage />} />
        <Route path="/payment-failure" element={<PaymentFailurePage />} />
      </Routes>
      <Toaster position="top-right" />
      <GlobalUpgradeModal />
    </>
  );
};

const GoogleOAuthScript: React.FC = () => {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return null;
};

const App: React.FC = () => {
  return (
    <>
      <GoogleOAuthScript />
      <Router>
        <AuthProvider>
          <SubscriptionProvider>
            <UpgradeProvider>
              <AppRoutes />
              <Toaster position="top-right" />
            </UpgradeProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </Router>
    </>
  );
};

export default App; 