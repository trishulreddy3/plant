import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { LogOut, Settings, Users, Plus, RefreshCw, Shield, Mail } from 'lucide-react';
import { getCurrentUser, logout } from '@/lib/auth';
import { syncUserCompanyId } from '@/lib/companySync';
import { useToast } from '@/hooks/use-toast';
import BackButton from '@/components/ui/BackButton';
import GradientHeading from '@/components/ui/GradientHeading';

const PlantAdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [user, setUser] = useState(getCurrentUser());
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const formatCompanyTitle = (name?: string) => {
    if (!name) return '';
    const trimmed = name.trim();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  };

  const formatRole = (role?: string) => {
    if (!role) return '';
    const map: Record<string, string> = {
      plant_admin: 'Admin',
      super_admin: 'Super Admin',
      technician: 'Technician',
    };
    if (map[role]) return map[role];
    return role
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

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
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-20 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <GradientHeading size="lg">{formatCompanyTitle(user.companyName)} solar analysis</GradientHeading>
              <p className="mt-0.5 text-xs sm:text-sm text-gray-500 font-medium">{formatRole(user.role)}</p>
            </div>
            <div className="shrink-0 inline-flex items-center gap-2">
              <Button onClick={handleSyncCompany} className="btn-outline-modern px-3 sm:px-4 py-2">
                <RefreshCw className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Sync Company</span>
                <span className="sm:hidden">Sync</span>
              </Button>
              <Button onClick={handleLogout} className="btn-outline-modern px-3 sm:px-4 py-2">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-0">
        <Tabs
          value={location.pathname.endsWith('/staff') ? 'staff' : 'infrastructure'}
          onValueChange={(v) => navigate(`/plant-admin-dashboard/${v}`)}
          className="w-full"
        >
          <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-[64px] sm:top-[68px] z-10">
            <div className="px-2 sm:px-4 py-3">
              <TabsList className="grid w-full grid-cols-2 max-w-3xl mx-auto rounded-full bg-muted/60 p-1 shadow-sm">
                <TabsTrigger
                  value="infrastructure"
                  className="h-12 sm:h-14 text-sm sm:text-base flex items-center justify-center gap-2 rounded-full border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:font-semibold data-[state=active]:shadow-lg data-[state=active]:border-primary data-[state=inactive]:text-muted-foreground data-[state=inactive]:bg-transparent data-[state=inactive]:border-transparent hover:data-[state=inactive]:bg-white hover:data-[state=inactive]:border-primary/40"
                >
                  <Settings className="h-5 w-5" /> Infrastructure
                </TabsTrigger>
                <TabsTrigger
                  value="staff"
                  className="h-12 sm:h-14 text-sm sm:text-base flex items-center justify-center gap-2 rounded-full border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:font-semibold data-[state=active]:shadow-lg data-[state=active]:border-primary data-[state=inactive]:text-muted-foreground data-[state=inactive]:bg-transparent data-[state=inactive]:border-transparent hover:data-[state=inactive]:bg-white hover:data-[state=inactive]:border-primary/40"
                >
                  <Users className="h-5 w-5" /> Staff
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value="infrastructure" className="mt-6 px-0">
            <Outlet />
          </TabsContent>
          <TabsContent value="staff" className="mt-6 px-0">
            <Outlet />
          </TabsContent>
        </Tabs>
      </main>

      

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
