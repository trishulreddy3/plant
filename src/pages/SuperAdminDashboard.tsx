import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LogOut, Building2, Plus, Zap, Eye, Trash2, Shield, Mail, Unlock, AlertTriangle } from 'lucide-react';
import { getCurrentUser, logout, getCompanies, type Company } from '@/lib/auth';
import { getTablesByCompany } from '@/lib/data';
import { getAllCompanies, checkServerStatus, deleteCompanyFolder, getPlantDetails, verifySuperAdminPassword, getCompanySessionStatus } from '@/lib/realFileSystem';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import BackButton from '@/components/ui/BackButton';
import GradientHeading from '@/components/ui/GradientHeading';

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(getCurrentUser());
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyTableCounts, setCompanyTableCounts] = useState<Record<string, number>>({});
  const [companySessionCounts, setCompanySessionCounts] = useState<Record<string, number>>({});
  const [serverStatus, setServerStatus] = useState<boolean>(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    company: Company | null;
  }>({ isOpen: false, company: null });
  const [isDeleting, setIsDeleting] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [blockedAdmins, setBlockedAdmins] = useState<any[]>([]);
  const [isUnblocking, setIsUnblocking] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string>('');

  useEffect(() => {
    const currentUser = getCurrentUser();
    const isSuperAdmin = currentUser && (
      currentUser.role === 'super_admin' ||
      (currentUser.role === 'admin' && currentUser.email === 'superadmin@gmail.com')
    );

    if (!currentUser || !isSuperAdmin) {
      navigate('/login');
      return;
    }
    setUser(currentUser);

    // Check server status and load companies
    const loadData = async () => {
      try {
        const isServerRunning = await checkServerStatus();
        setServerStatus(isServerRunning);

        if (isServerRunning) {
          const fileSystemCompanies = await getAllCompanies();

          // Map SQL Backend response (companyId, companyName) to Frontend Interface (id, name)
          const mappedCompanies = fileSystemCompanies.map((c: any) => ({
            id: c.companyId || c.id,
            name: c.companyName || c.name,
            plantPowerKW: c.plantPowerKW,
            panelVoltage: c.voltagePerPanel,
            panelCurrent: c.currentPerPanel,
            totalTables: c.totalTables || 0,
            adminId: '',
            createdAt: c.createdAt || c.created_at || new Date().toISOString()
          })).filter(c => c.id && c.name?.toLowerCase() !== 'microsyslogic' && c.name?.toLowerCase() !== 'microsys'); // Ensure we only have valid companies and exclude superadmin's own company

          setCompanies(mappedCompanies);

          // Load table counts for each company from backend
          const tableCounts: Record<string, number> = {};
          for (const company of mappedCompanies) { // Use mapped companies which have 'id'
            try {
              const plantDetails = await getPlantDetails(company.id);
              if (plantDetails) {
                // Support both legacy 'tables' array and new 'live_data' or 'dedicated_data'
                const dataList = plantDetails.tables || (plantDetails as any).live_data || (plantDetails as any).dedicated_data || [];
                tableCounts[company.id] = dataList.length || 0;
              } else {
                tableCounts[company.id] = 0;
              }
            } catch (error) {
              console.error(`Error loading plant details for ${company.id}:`, error);
              tableCounts[company.id] = 0;
            }
          }
          setCompanyTableCounts(tableCounts);

          // Load session status for each company
          const sessionCounts: Record<string, number> = {};
          for (const company of mappedCompanies) {
            try {
              sessionCounts[company.id] = await getCompanySessionStatus(company.id);
            } catch (error) {
              sessionCounts[company.id] = 0;
            }
          }
          setCompanySessionCounts(sessionCounts);

          // Fetch blocked admins for Super Admin
          const { getBlockedAdmins } = await import('@/lib/realFileSystem');
          const blocked = await getBlockedAdmins();
          setBlockedAdmins(blocked);
        } else {
          const localStorageCompanies = getCompanies();
          setCompanies(localStorageCompanies);
          const tableCounts: Record<string, number> = {};
          localStorageCompanies.forEach(company => {
            tableCounts[company.id] = getTablesByCompany(company.id).length;
          });
          setCompanyTableCounts(tableCounts);
        }
      } catch (error) {
        console.error('Error loading companies:', error);
        // Fallback
        const localStorageCompanies = getCompanies();
        setCompanies(localStorageCompanies);
        const tableCounts: Record<string, number> = {};
        localStorageCompanies.forEach(company => {
          tableCounts[company.id] = getTablesByCompany(company.id).length;
        });
        setCompanyTableCounts(tableCounts);
      }
    };

    loadData();
    const interval = setInterval(loadData, 10000); // 10 seconds
    return () => clearInterval(interval);
  }, [navigate]);

  const handleLogout = () => {
    setShowLogoutDialog(true);
  };

  const confirmLogout = async () => {
    await logout();
    navigate('/');
  };

  const cancelLogout = () => {
    setShowLogoutDialog(false);
  };

  const handleDeleteCompany = async (company: Company) => {
    // Immediately check session count before opening
    try {
      const activeCount = await getCompanySessionStatus(company.id);
      if (activeCount > 0) {
        setDeleteError('some of the staff of that company is still logged in still want to proceed');
      } else {
        setDeleteError('');
      }
    } catch (e) {
      setDeleteError('');
    }
    setDeleteDialog({ isOpen: true, company });
  };

  const handleDeleteConfirm = async (password: string, force: boolean = false) => {
    if (!deleteDialog.company || !user) return;
    setDeleteError('');

    setIsDeleting(true);
    try {
      // Verify super admin password VIA BACKEND
      const isValid = await verifySuperAdminPassword(password);
      if (!isValid) {
        throw new Error('Invalid password');
      }

      // Delete company folder
      if (serverStatus) {
        await deleteCompanyFolder(deleteDialog.company.id, password, force);
      }

      // Remove from companies list
      setCompanies(companies.filter(c => c.id !== deleteDialog.company!.id));

      // Close dialog
      setDeleteDialog({ isOpen: false, company: null });

      // Show success message
      alert(`Company "${deleteDialog.company.name}" has been permanently deleted.`);
    } catch (error: any) {
      console.error('Error deleting company:', error);
      if (error.status === 409) {
        setDeleteError(error.data?.error || error.message);
      } else {
        alert(error.message || 'Failed to delete company. Please check your password and try again.');
        // If not a 409, might want to close or stay open. Error alert is enough.
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ isOpen: false, company: null });
  };

  const handleUnblockAdmin = async (admin: any) => {
    try {
      setIsUnblocking(admin.id);
      const { updateStaffStatus } = await import('@/lib/realFileSystem');
      await updateStaffStatus(admin.companyId, admin.id, 'active');

      // Update local state
      setBlockedAdmins(prev => prev.filter(a => a.id !== admin.id));

      alert(`Admin "${admin.name}" has been unblocked.`);
    } catch (error) {
      console.error('Error unblocking admin:', error);
      alert('Failed to unblock admin.');
    } finally {
      setIsUnblocking(null);
    }
  };

  if (!user) return null;

  return (
    <>
      <style>{`
        .glassmorphism-card {
          box-sizing: border-box;
          width: 100%;
          min-height: 254px;
          height: auto;
          background: rgba(217, 217, 217, 0.58);
          border: 1px solid white;
          box-shadow: 12px 17px 51px rgba(0, 0, 0, 0.22);
          backdrop-filter: blur(6px);
          border-radius: 17px;
          cursor: pointer;
          transition: all 0.5s;
          display: flex;
          flex-direction: column;
          user-select: none;
          font-weight: bolder;
          color: black;
          padding: 20px;
        }

        .glassmorphism-card:hover {
          border: 1px solid black;
          transform: scale(1.05);
        }

        .glassmorphism-card:active {
          transform: scale(0.95) rotateZ(1.7deg);
        }
      `}</style>
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="absolute top-4 left-4 z-10">
          <BackButton />
        </div>
        <header className="glass-header sticky top-0 z-10">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <GradientHeading size="md" className="sm:size-lg truncate">Super Admin Dashboard</GradientHeading>
              <p className="text-[10px] sm:text-sm text-muted-foreground truncate">Microsyslogic SCADA Solutions</p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className={`w-1.5 h-1.5 rounded-full ${serverStatus ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-[8px] sm:text-xs text-muted-foreground whitespace-nowrap">
                  {serverStatus ? 'Server: Online' : 'Server: Offline'}
                </span>
              </div>
            </div>
            <Button onClick={handleLogout} variant="outline" className="h-9 sm:h-10 text-xs sm:text-sm px-2 sm:px-4 shrink-0">
              <LogOut className="sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
              <span className="sm:hidden text-[10px]">Exit</span>
            </Button>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Registered Companies</h2>
              <p className="text-sm text-muted-foreground">Monitor solar plant companies</p>
            </div>
            <Button onClick={() => navigate('/add-company')} className="gradient-primary">
              <Plus className="mr-2 h-4 w-4" />
              Add Company
            </Button>
          </div>

          {companies.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {companies.map((company, index) => {
                const tableCount = companyTableCounts[company.id] || 0;
                return (
                  <div
                    key={company.id || `company-${index}`} // Ensure unique key
                    className="glassmorphism-card"
                    onClick={() => navigate(`/company-monitor/${company.id}`)}
                  >
                    {/* Header Section */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        <h3 className="text-lg font-bold">{company.name}</h3>
                      </div>
                      <Badge variant="outline" className="bg-white/50 text-black border-black/20">
                        {tableCount} tables
                      </Badge>
                    </div>

                    {/* Content Grid */}
                    <div className="grid grid-cols-2 gap-3 text-sm mb-4 flex-1">
                      <div className="space-y-1">
                        <p className="text-xs opacity-70">Plant Power</p>
                        <p className="font-semibold flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          {company.plantPowerKW} kW
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs opacity-70">Panel Specs</p>
                        <p className="font-semibold">
                          {company.panelVoltage}V / {company.panelCurrent}A
                        </p>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex gap-2">
                      <button
                        className="flex-1 bg-white/20 hover:bg-white/30 text-black border border-black/20 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/company-monitor/${company.id}`);
                        }}
                      >
                        <Eye className="h-3 w-3" />
                        Monitor Activity
                      </button>
                      <button
                        className="w-10 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg h-10 flex items-center justify-center transition-all duration-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCompany(company);
                        }}
                        title="Delete Company"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Footer Info */}
                    <div className="mt-4 pt-4 border-t border-black/10 flex items-center justify-between text-[10px] opacity-60">
                      <span className="flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        Online: <span className={`font-bold ${companySessionCounts[company.id] > 0 ? 'text-green-600' : ''}`}>{companySessionCounts[company.id] || 0} staff</span>
                      </span>
                      <span>{new Date(company.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Card className="glass-card">
              <CardContent className="py-12 text-center">
                <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-semibold mb-2">No Companies Registered</p>
                <p className="text-muted-foreground mb-4">Get started by adding your first company</p>
                <Button onClick={() => navigate('/add-company')} className="gradient-primary">
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Company
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Blocked Admins Section */}
          {blockedAdmins.length > 0 && (
            <div className="mt-12 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Shield className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-red-900">Security Alert: Blocked Company Admins</h2>
                  <p className="text-sm text-red-700">The following admins have been blocked due to 3+ failed login attempts.</p>
                </div>
              </div>

              <div className="grid gap-4">
                {blockedAdmins.map((admin) => (
                  <Card key={admin.id} className="border-red-200 bg-red-50/30 overflow-hidden">
                    <CardContent className="p-6 flex flex-col md:flex-row justify-between items-center gap-4">
                      <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="p-3 bg-red-500 rounded-full shadow-lg shadow-red-500/20">
                          <AlertTriangle className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-lg">{admin.name}</span>
                            <Badge className="bg-red-600 text-white uppercase font-bold text-[10px]">Blocked</Badge>
                          </div>
                          <div className="text-sm text-gray-600 flex flex-wrap gap-x-4">
                            <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {admin.companyName}</span>
                            <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {admin.email}</span>
                            <span className="text-red-600 font-bold">Failed Attempts: {admin.failedLoginAttempts}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleUnblockAdmin(admin)}
                        disabled={isUnblocking === admin.id}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 shadow-lg shadow-green-600/20 w-full md:w-auto"
                      >
                        {isUnblocking === admin.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        ) : (
                          <Unlock className="mr-2 h-4 w-4" />
                        )}
                        Verify & Unblock
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
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

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmationDialog
          isOpen={deleteDialog.isOpen}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          title="Delete Company"
          description={`You are about to permanently delete the company "${deleteDialog.company?.name}". This action will remove all company data, users, tables, and plant details.`}
          entityName={deleteDialog.company?.name || ''}
          entityType="company"
          adminEmail={user?.email || ''}
          isLoading={isDeleting}
          error={deleteError}
          onClearError={() => setDeleteError('')}
        />
      </div>
    </>
  );
};

export default SuperAdminDashboard;
