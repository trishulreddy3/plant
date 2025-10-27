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

      {/* Company Information Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 mt-8">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Company Info */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Microsyslogic</h3>
              <p className="text-sm text-gray-600 mb-3">
                Advanced solar plant monitoring and management system for optimal energy production.
              </p>
              <div className="flex items-center text-sm text-gray-500">
                <Shield className="h-4 w-4 mr-2" />
                <span>Secure & Compliant</span>
              </div>
            </div>

            {/* Contact */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Contact</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  <a href="mailto:SuperAdmin.Microsyslogic@gmail.com" className="hover:text-primary">
                    SuperAdmin.Microsyslogic@gmail.com
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-200 mt-6 pt-4 flex flex-col sm:flex-row justify-between items-center text-sm text-gray-500">
            <div>
              © 2025 Microsyslogic. All rights reserved.
            </div>
            <div className="flex items-center space-x-4 mt-2 sm:mt-0">
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PlantAdminDashboard;
