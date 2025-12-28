import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LogOut, Building2, Plus, Zap, Eye, Trash2, Shield, Mail } from 'lucide-react';
import { getCurrentUser, logout, getCompanies, type Company } from '@/lib/auth';
import { getTablesByCompany } from '@/lib/data';
import { getAllCompanies, checkServerStatus, deleteCompanyFolder, getPlantDetails, verifySuperAdminPassword } from '@/lib/realFileSystem';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import BackButton from '@/components/ui/BackButton';
import GradientHeading from '@/components/ui/GradientHeading';

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(getCurrentUser());
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyTableCounts, setCompanyTableCounts] = useState<Record<string, number>>({});
  const [serverStatus, setServerStatus] = useState<boolean>(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    company: Company | null;
  }>({ isOpen: false, company: null });
  const [isDeleting, setIsDeleting] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

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
          setCompanies(fileSystemCompanies.map(c => ({
            id: c.id,
            name: c.name,
            plantPowerKW: c.plantPowerKW,
            panelVoltage: c.voltagePerPanel,
            panelCurrent: c.currentPerPanel,
            totalTables: c.totalTables,
            adminId: '', // Placeholder
            createdAt: c.createdAt
          })));

          // Load table counts for each company from backend
          const tableCounts: Record<string, number> = {};
          for (const company of fileSystemCompanies) {
            try {
              const plantDetails = await getPlantDetails(company.id);
              if (plantDetails) {
                tableCounts[company.id] = plantDetails.tables?.length || 0;
              } else {
                tableCounts[company.id] = 0;
              }
            } catch (error) {
              console.error(`Error loading plant details for ${company.id}:`, error);
              tableCounts[company.id] = 0;
            }
          }
          setCompanyTableCounts(tableCounts);
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

  const confirmLogout = () => {
    logout();
    navigate('/');
  };

  const cancelLogout = () => {
    setShowLogoutDialog(false);
  };

  const handleDeleteCompany = (company: Company) => {
    setDeleteDialog({ isOpen: true, company });
  };

  const handleDeleteConfirm = async (password: string) => {
    if (!deleteDialog.company || !user) return;

    setIsDeleting(true);
    try {
      // Verify super admin password VIA BACKEND
      const isValid = await verifySuperAdminPassword(password);
      if (!isValid) {
        throw new Error('Invalid password');
      }

      // Delete company folder
      if (serverStatus) {
        await deleteCompanyFolder(deleteDialog.company.id);
      }

      // Remove from companies list
      setCompanies(companies.filter(c => c.id !== deleteDialog.company!.id));

      // Close dialog
      setDeleteDialog({ isOpen: false, company: null });

      // Show success message
      alert(`Company "${deleteDialog.company.name}" has been permanently deleted.`);
    } catch (error) {
      console.error('Error deleting company:', error);
      alert('Failed to delete company. Please check your password and try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ isOpen: false, company: null });
  };

  if (!user) return null;

  return (
    <>
      <style>{`
        .glassmorphism-card {
          box-sizing: border-box;
          width: 100%;
          height: 254px;
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
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div>
              <GradientHeading size="lg">Super Admin Dashboard</GradientHeading>
              <p className="text-sm text-muted-foreground">Microsyslogic - Monitor & Manage</p>
              <div className="flex items-center gap-2 mt-1">
                <div className={`w-2 h-2 rounded-full ${serverStatus ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-xs text-muted-foreground">
                  {serverStatus ? 'File System Server: Online' : 'File System Server: Offline (using localStorage)'}
                </span>
              </div>
            </div>
            <Button onClick={handleLogout} variant="outline">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
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
              {companies.map((company) => {
                const tableCount = companyTableCounts[company.id] || 0;
                return (
                  <div
                    key={company.id}
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
        />
      </div>
    </>
  );
};

export default SuperAdminDashboard;
