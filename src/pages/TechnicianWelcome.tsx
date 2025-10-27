import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sun, ArrowRight, Building2 } from 'lucide-react';
import { getCurrentUser, isLoggedIn } from '@/lib/auth';
import BackButton from '@/components/ui/BackButton';

const TechnicianWelcome = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();

  useEffect(() => {
    // Redirect if not logged in or not a user
    if (!isLoggedIn() || !user || user.role !== 'technician') {
      navigate('/');
      return;
    }
  }, [navigate, user]);

  const handleContinueToDashboard = () => {
    navigate('/technician-dashboard');
  };

  // Show loading if user data is not available yet
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-primary">Loading...</h2>
          <p className="text-muted-foreground">Please wait while we load your information</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-6">
      <div className="absolute top-4 left-4 z-10">
        <BackButton />
      </div>
      <div className="w-full max-w-2xl">
        <Card className="glass-card p-8 text-center">
          {/* Company Logo/Icon */}
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-green-500 to-blue-600 rounded-3xl mb-8 shadow-lg shadow-green-500/25 mx-auto">
            <Building2 className="w-12 h-12 text-white" />
          </div>

          {/* Welcome Message */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-primary mb-4">
              Welcome to {user.companyName}
            </h1>
            <p className="text-xl text-muted-foreground mb-2">
              Solar Plant Monitoring System
            </p>
            <p className="text-lg text-gray-600">
              Hello, <span className="font-semibold text-primary">{user.email}</span>
            </p>
          </div>

          {/* Company Description */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-6 mb-8 border border-green-200">
            <div className="flex items-center justify-center mb-4">
              <Sun className="w-8 h-8 text-green-600 mr-3" />
              <h2 className="text-2xl font-bold text-green-800">Solar Energy Management</h2>
            </div>
            <p className="text-green-700 text-lg leading-relaxed">
              Monitor your solar plant's performance, track energy production, and stay updated with real-time panel status. 
              Access comprehensive data about your solar infrastructure and optimize your renewable energy investment.
            </p>
          </div>

          {/* Features Preview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white/50 rounded-xl p-4 border border-gray-200">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Sun className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">Real-time Monitoring</h3>
              <p className="text-sm text-gray-600">Live panel status and performance data</p>
            </div>
            
            <div className="bg-white/50 rounded-xl p-4 border border-gray-200">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Building2 className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">Plant Overview</h3>
              <p className="text-sm text-gray-600">Complete solar plant infrastructure view</p>
            </div>
            
            <div className="bg-white/50 rounded-xl p-4 border border-gray-200">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <ArrowRight className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">Easy Access</h3>
              <p className="text-sm text-gray-600">Quick navigation to all features</p>
            </div>
          </div>

          {/* Continue Button */}
          <Button
            onClick={handleContinueToDashboard}
            className="w-full h-16 text-lg btn-primary-modern mb-6"
          >
            <ArrowRight className="mr-3 h-6 w-6" />
            Continue to Dashboard
          </Button>

          {/* Footer */}
          <div className="text-center text-sm text-gray-500">
            <p>Powered by Microsyslogic Solar Management System</p>
            <p className="mt-1">© 2025 {user.companyName}. All rights reserved.</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TechnicianWelcome;





