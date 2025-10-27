import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { useNavigation } from '@/hooks/useNavigation';
import SuperAdminDashboard from '@/components/dashboards/SuperAdminDashboard';
import PlantAdminDashboard from '@/components/dashboards/PlantAdminDashboard';
import TechnicianDashboard from '@/components/dashboards/TechnicianDashboard';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import BackButton from '@/components/ui/BackButton';

const Dashboard = () => {
  const { user } = useAuth();
  const { goToLogin } = useNavigation();

  useEffect(() => {
    // Additional validation for dashboard access
    if (!user) {
      console.log('Dashboard: No user found, redirecting to login');
      goToLogin();
      return;
    }

    // Validate user has required properties
    if (user.role === 'plantadmin' && !user.companyName) {
      console.error('Dashboard: Plant admin without company association');
    }

    if (user.role === 'technician' && !user.companyName) {
      console.error('Dashboard: Technician without company association');
    }

    console.log(`Dashboard: Loading ${user.role} dashboard for user:`, user.email);
  }, [user, goToLogin]);

  // Show loading state while user is being validated
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        <div className="absolute top-4 left-4 z-10">
          <BackButton />
        </div>
        <Card className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </Card>
      </div>
    );
  }

  // Render appropriate dashboard based on user role
  switch (user.role) {
    case 'superadmin':
      return <SuperAdminDashboard />;
    case 'plantadmin':
      return <PlantAdminDashboard />;
    case 'technician':
      return <TechnicianDashboard />;
    default:
      console.error(`Dashboard: Unknown user role: ${user.role}`);
      return (
        <div className="min-h-screen flex items-center justify-center">
          <Card className="p-8 text-center">
            <h2 className="text-xl font-bold mb-2">Access Error</h2>
            <p className="text-muted-foreground mb-4">
              Unknown user role: {user.role}
            </p>
            <button 
              onClick={goToLogin}
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
            >
              Return to Login
            </button>
          </Card>
        </div>
      );
  }
};

export default Dashboard;
