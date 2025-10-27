import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getCurrentUser, isLoggedIn } from '@/lib/auth';

interface AutoLoginProps {
  children: React.ReactNode;
}

const AutoLogin: React.FC<AutoLoginProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkExistingSession = () => {
      try {
        const user = getCurrentUser();
        
        if (user && isLoggedIn() && location.pathname === '/') {
          // Redirect based on user role
          switch (user.role) {
            case 'super_admin':
              navigate('/super-admin-dashboard');
              break;
            case 'plant_admin':
              navigate('/plant-admin-dashboard');
              break;
            case 'technician':
              navigate('/technician-welcome');
              break;
            default:
              console.warn('Unknown user role:', user.role);
          }
        }
      } catch (error) {
        console.error('Auto-login error:', error);
      } finally {
        setIsChecking(false);
      }
    };

    // Small delay to ensure auth system is initialized
    const timer = setTimeout(checkExistingSession, 100);
    
    return () => clearTimeout(timer);
  }, [navigate, location.pathname]);

  // Show loading spinner while checking for existing session
  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-primary">Checking Login Status...</h2>
          <p className="text-muted-foreground">Please wait while we verify your session</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AutoLogin;
