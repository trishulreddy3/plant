import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { LogOut, Settings, Users, Plus, RefreshCw, Shield, Mail } from 'lucide-react';
import { getCurrentUser, logout } from '@/lib/auth';
import { syncUserCompanyId } from '@/lib/companySync';
import { useToast } from '@/hooks/use-toast';
import BackButton from '@/components/ui/BackButton';

const PlantAdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState(getCurrentUser());
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  useEffect(() => {
    const initializeUser = async () => {
      const currentUser = getCurrentUser();
      if (!currentUser || currentUser.role !== 'plant_admin') {
        navigate('/admin-login');
        return;
      }
      
      // Sync user's company ID with backend
      await syncUserCompanyId();
      
      // Get updated user data
      const updatedUser = getCurrentUser();
      setUser(updatedUser);
    };
    
    initializeUser();
  }, [navigate]);

  const handleLogout = () => {
    setShowLogoutDialog(true);
  };

  const confirmLogout = () => {
    logout();
    navigate('/');
  };

  const cancelLogout = () => {
    setShowLogoutDialog(false);
  };

  const handleSyncCompany = async () => {
    try {
      const synced = await syncUserCompanyId();
      if (synced) {
        const updatedUser = getCurrentUser();
        setUser(updatedUser);
        toast({
          title: 'Company Synchronized',
          description: 'Your company ID has been updated to match the backend system.',
        });
      } else {
        toast({
          title: 'Synchronization Complete',
          description: 'Your company ID is already synchronized with the backend.',
        });
      }
    } catch (error) {
      console.error('Error syncing company:', error);
      toast({
        title: 'Sync Failed',
        description: 'Failed to synchronize company ID. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="absolute top-4 left-4 z-10">
        <BackButton />
      </div>
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">
              WELCOME {user.companyName?.toUpperCase()} ADMIN
            </h1>
            <p className="text-base text-gray-600 font-medium">{user.email}</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleSyncCompany} className="btn-outline-modern px-4 py-2">
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync Company
            </Button>
            <Button onClick={handleLogout} className="btn-outline-modern px-4 py-2">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-3">
          <Card
            className="card-modern hover:shadow-2xl transition-all cursor-pointer group"
            onClick={() => navigate('/infrastructure')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary group-hover:rotate-90 transition-transform" />
                Infrastructure
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Manage plant power, panels, and tables configuration
              </p>
            </CardContent>
          </Card>

          <Card
            className="card-modern hover:shadow-2xl transition-all cursor-pointer group"
            onClick={() => navigate('/existing-staff-members')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                Existing Staff
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View and manage all registered staff members
              </p>
            </CardContent>
          </Card>

          <Card
            className="card-modern hover:shadow-2xl transition-all cursor-pointer group"
            onClick={() => navigate('/add-staff')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                Add New Staff
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Create new staff member accounts with auto-generated passwords
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

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

            {/* Quick Links */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Quick Links</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="/privacy-policy" className="text-gray-600 hover:text-primary">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="/terms-of-service" className="text-gray-600 hover:text-primary">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="/help" className="text-gray-600 hover:text-primary">
                    Help & Support
                  </a>
                </li>
              </ul>
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
              <span>GDPR Compliant</span>
              <span>•</span>
              <span>CCPA Compliant</span>
              <span>•</span>
              <span>ISO 27001</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to logout? You will need to login again to access the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelLogout}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLogout} className="bg-red-600 hover:bg-red-700">
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PlantAdminDashboard;
