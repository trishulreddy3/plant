import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCallback } from 'react';

export const useNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const goToLogin = useCallback(() => {
    console.log('Navigating to login page');
    navigate('/', { replace: true });
  }, [navigate]);

  const goToDashboard = useCallback(() => {
    console.log('Navigating to dashboard');
    navigate('/dashboard', { replace: true });
  }, [navigate]);

  const goBack = useCallback(() => {
    console.log('Navigating back');
    navigate(-1);
  }, [navigate]);

  const logoutAndRedirect = useCallback(() => {
    console.log('Logging out and redirecting to login');
    logout();
    navigate('/', { replace: true });
  }, [logout, navigate]);

  const redirectBasedOnRole = useCallback(() => {
    if (!user) {
      goToLogin();
      return;
    }

    console.log(`Redirecting user with role: ${user.role}`);
    goToDashboard();
  }, [user, goToLogin, goToDashboard]);

  const isCurrentRoute = useCallback((path: string) => {
    return location.pathname === path;
  }, [location.pathname]);

  const isProtectedRoute = useCallback(() => {
    return location.pathname.startsWith('/dashboard');
  }, [location.pathname]);

  const isPublicRoute = useCallback(() => {
    return location.pathname === '/';
  }, [location.pathname]);

  const canAccessRoute = useCallback((requiredRoles?: string[]) => {
    if (!user) return false;
    if (!requiredRoles || requiredRoles.length === 0) return true;
    return requiredRoles.includes(user.role);
  }, [user]);

  const navigateWithAuth = useCallback((path: string, requiredRoles?: string[]) => {
    if (!user) {
      console.log('Navigation blocked: User not authenticated');
      goToLogin();
      return false;
    }

    if (requiredRoles && !canAccessRoute(requiredRoles)) {
      console.log(`Navigation blocked: User role '${user.role}' not authorized for path '${path}'`);
      goToDashboard();
      return false;
    }

    navigate(path);
    return true;
  }, [user, navigate, goToLogin, goToDashboard, canAccessRoute]);

  return {
    // Navigation functions
    goToLogin,
    goToDashboard,
    goBack,
    logoutAndRedirect,
    redirectBasedOnRole,
    navigateWithAuth,

    // Route checking functions
    isCurrentRoute,
    isProtectedRoute,
    isPublicRoute,
    canAccessRoute,

    // Current state
    currentPath: location.pathname,
    currentUser: user,
    isAuthenticated: !!user,

    // Raw navigation utilities
    navigate,
    location
  };
};

export default useNavigation;
