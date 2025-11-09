import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LogOut, Settings, Users, Plus, Shield, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import InfrastructureView from '@/components/plant/InfrastructureView';
import TechnicianManagement from '@/components/plant/TechnicianManagement';

type ViewType = 'main' | 'infrastructure' | 'users' | 'addUser';

const PlantAdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<ViewType>('main');

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (currentView === 'infrastructure') {
    return <InfrastructureView onBack={() => setCurrentView('main')} />;
  }

  if (currentView === 'users' || currentView === 'addUser') {
    return (
      <TechnicianManagement
        onBack={() => setCurrentView('main')}
        initialView={currentView === 'addUser' ? 'add' : 'list'}
      />
    );
  }

  return (
    <div className="min-h-screen p-6 flex flex-col">
      {/* Header */}
      <div className="glass-panel p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 text-primary drop-shadow-lg">
              WELCOME {user?.companyName?.toUpperCase()} ADMIN
            </h1>
            <p className="text-muted-foreground">Manage your solar plant operations</p>
          </div>
          <Button onClick={handleLogout} variant="destructive">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-grow">
        <Card
          className="glass-card p-8 hover:scale-105 transition-transform cursor-pointer"
          onClick={() => setCurrentView('infrastructure')}
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mb-4 glow-effect">
              <Settings className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Infrastructure</h3>
            <p className="text-muted-foreground">
              Manage plant power, panels, and table configurations
            </p>
          </div>
        </Card>

        <Card
          className="glass-card p-8 hover:scale-105 transition-transform cursor-pointer"
          onClick={() => setCurrentView('users')}
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-accent/20 border-2 border-accent flex items-center justify-center mb-4">
              <Users className="w-10 h-10 text-accent" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Existing Staff Members</h3>
            <p className="text-muted-foreground">
              View and manage staff member accounts and permissions
            </p>
          </div>
        </Card>

        <Card
          className="glass-card p-8 hover:scale-105 transition-transform cursor-pointer"
          onClick={() => setCurrentView('addUser')}
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center mb-4">
              <Plus className="w-10 h-10 text-green-500" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Add Staff Member</h3>
            <p className="text-muted-foreground">
              Create new staff member accounts with auto-generated passwords
            </p>
          </div>
        </Card>
      </div>

      
    </div>
  );
};

export default PlantAdminDashboard;
