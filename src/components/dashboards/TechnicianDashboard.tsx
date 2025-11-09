import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PanelMonitor from '@/components/panels/PanelMonitor';

const TechnicianDashboard = () => {
  const { user, logout, companies } = useAuth();
  
  // Get current company data for key generation
  const currentCompany = companies.find(c => c.name === user?.companyName);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="glass-panel p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome, {user?.name}</h1>
            <p className="text-muted-foreground">{user?.companyName}</p>
          </div>
          <Button onClick={handleLogout} variant="destructive">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Panel Monitor */}
      <PanelMonitor 
        key={`user-${user?.companyName}-${currentCompany?.totalTables}-${currentCompany?.tableConfigs?.length || 0}`}
        companyName={user?.companyName || ''} 
      />
    </div>
  );
};

export default TechnicianDashboard;
