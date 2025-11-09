import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface NavigationManagerProps {
  children: React.ReactNode;
}

const NavigationManager: React.FC<NavigationManagerProps> = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Handle browser back/forward navigation
    const handlePopState = (event: PopStateEvent) => {
      console.log('Browser navigation detected:', event.state);
      
      // Validate the navigation based on current user state
      if (!user && location.pathname !== '/') {
        navigate('/', { replace: true });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user, navigate, location.pathname]);

  useEffect(() => {
    // Handle deep linking and direct URL access
    const handleDirectAccess = () => {
      const isProtectedRoute = location.pathname.startsWith('/dashboard');
      const isPublicRoute = location.pathname === '/';

      if (isProtectedRoute && !user) {
        console.log('Direct access to protected route without authentication');
        navigate('/', { replace: true });
      }

      if (isPublicRoute && user) {
        console.log('Direct access to login page while authenticated');
        navigate('/dashboard', { replace: true });
      }
    };

    handleDirectAccess();
  }, [user, location.pathname, navigate]);

  // Provide navigation utilities to child components
  const navigationUtils = {
    goToLogin: () => navigate('/'),
    goToDashboard: () => navigate('/dashboard'),
    goBack: () => navigate(-1),
    isCurrentRoute: (path: string) => location.pathname === path,
    getCurrentPath: () => location.pathname
  };

  return (
    <div data-navigation-manager>
      {React.cloneElement(children as React.ReactElement, { navigationUtils })}
    </div>
  );
};

export default NavigationManager;
