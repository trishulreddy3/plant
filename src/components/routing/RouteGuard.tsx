import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

interface RouteGuardProps {
  children: React.ReactNode;
}

const RouteGuard: React.FC<RouteGuardProps> = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Log navigation attempts for debugging
    console.log('Route Guard: Navigating to', location.pathname, 'User:', user?.email || 'Not logged in');

    // Handle session expiration or invalid states
    if (location.pathname !== '/' && !user) {
      console.log('Session expired or invalid, redirecting to login');
      navigate('/', { replace: true });
      return;
    }

    // Redirect authenticated users away from login page
    if (location.pathname === '/' && user) {
      console.log('User already authenticated, redirecting to dashboard');
      navigate('/dashboard', { replace: true });
      return;
    }

    // Validate user role and company association
    if (user && location.pathname === '/dashboard') {
      if (user.role === 'plantadmin' && !user.companyName) {
        console.error('Plant admin without company association, logging out');
        // Could add logout logic here if needed
      }
      
      if (user.role === 'technician' && !user.companyName) {
        console.error('Technician without company association, logging out');
        // Could add logout logic here if needed
      }
    }
  }, [user, location.pathname, navigate]);

  return <>{children}</>;
};

export default RouteGuard;
