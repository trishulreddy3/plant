import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Activity, Building2, Clock, User, Trash2, Plus, Edit, Eye, Users } from 'lucide-react';
import { getCurrentUser, getCompanies } from '@/lib/auth';
import { getActivityLogsByCompany, getTablesByCompany, getPanelsByCompany, type ActivityLog } from '@/lib/data';
import BackButton from '@/components/ui/BackButton';

const CompanyMonitor = () => {
  const navigate = useNavigate();
  const { companyId } = useParams<{ companyId: string }>();
  const { toast } = useToast();
  const [user] = useState(getCurrentUser());
  const [company, setCompany] = useState<any>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [panels, setPanels] = useState<any[]>([]);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [adminDetails, setAdminDetails] = useState<any>(null);
  const [companyUsers, setCompanyUsers] = useState<any[]>([]);
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; company: any }>({ isOpen: false, company: null });
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'super_admin') {
      navigate('/admin-login');
      return;
    }

    if (!companyId) {
      navigate('/super-admin-dashboard');
      return;
    }

    loadData();
    
    // Auto-refresh data every 5 seconds
    const interval = setInterval(() => {
      loadData();
    }, 5000);

    return () => clearInterval(interval);
  }, [user, navigate, companyId]);

  const loadUserDetails = async () => {
    if (!companyId) return;

    try {
      // Get admin details
      const { getAllCompanies } = await import('@/lib/realFileSystem');
      const response = await fetch(`http://localhost:5000/api/companies/${companyId}/admin`);
      if (response.ok) {
        const adminData = await response.json();
        setAdminDetails(adminData);

        // Get company users and filter out the admin
        const usersResponse = await fetch(`http://localhost:5000/api/companies/${companyId}/users`);
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          
          // Filter out the admin from users list
          const filteredUsers = usersData.filter((user: any) => {
            // Remove admin from users list
            return user.email !== adminData.email && user.role !== 'plant_admin';
          });
          
          setCompanyUsers(filteredUsers);
        }
      }
    } catch (error) {
      console.error('Error loading user details:', error);
    }
  };

  const loadData = async () => {
    if (!companyId) return;

    try {
      // Get company data from backend
      const { getAllCompanies } = await import('@/lib/realFileSystem');
      const backendCompanies = await getAllCompanies();
      const selectedCompany = backendCompanies.find(c => c.id === companyId);
      setCompany(selectedCompany);

      // Get activity logs (temporarily disabled to avoid deprecation warnings)
      // const logs = getActivityLogsByCompany(companyId);
      // setActivityLogs(logs);
      setActivityLogs([]); // Empty for now

      // Get tables and panels from backend
      const { getPlantDetails } = await import('@/lib/realFileSystem');
      const plantDetails = await getPlantDetails(companyId);
      
      if (plantDetails) {
        setTables(plantDetails.tables || []);
        // Calculate total panels from tables
        const totalPanels = plantDetails.tables.reduce((sum, table) => sum + table.panelsTop + table.panelsBottom, 0);
        setPanels([]); // We don't need individual panel data for this view
      } else {
        setTables([]);
        setPanels([]);
      }

      // Load user details
      await loadUserDetails();
    } catch (error) {
      console.error('Error loading company data:', error);
      
      // Fallback to localStorage
      const companies = getCompanies();
      const selectedCompany = companies.find(c => c.id === companyId);
      setCompany(selectedCompany);

      const logs = getActivityLogsByCompany(companyId);
      setActivityLogs(logs);

      const companyTables = getTablesByCompany(companyId);
      setTables(companyTables);

      const companyPanels = getPanelsByCompany(companyId);
      setPanels(companyPanels);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return <Plus className="h-4 w-4 text-green-500" />;
      case 'update':
        return <Edit className="h-4 w-4 text-blue-500" />;
      case 'delete':
        return <Trash2 className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'update':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'delete':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const handleDeleteCompany = () => {
    setDeleteDialog({ isOpen: true, company });
  };

  const handleDeleteConfirm = async (password: string) => {
    if (!company || !user) return;

    setIsDeleting(true);
    try {
      // Verify password with backend
      const response = await fetch('http://localhost:5000/api/verify-super-admin-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const result = await response.json();

      if (!result.success) {
        toast({
          title: "Invalid Password",
          description: "Please enter the correct super admin password.",
          variant: "destructive",
        });
        return;
      }

      // Password verified, proceed with deletion
      const { deleteCompanyFolder } = await import('@/lib/realFileSystem');
      
      // Delete company folder
      await deleteCompanyFolder(company.id);
      
      toast({
        title: "Company Deleted",
        description: `Company "${company.name}" has been successfully deleted.`,
        variant: "default",
      });
      
      // Navigate back to dashboard
      navigate('/super-admin-dashboard');
    } catch (error) {
      console.error('Error deleting company:', error);
      toast({
        title: "Deletion Failed",
        description: "Failed to delete company. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialog({ isOpen: false, company: null });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ isOpen: false, company: null });
  };

  if (!user) return null;

  // Show loading state while company data is being fetched
  if (!company) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <header className="glass-header sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/super-admin-dashboard')}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <Card className="glass-card">
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
              <p className="text-lg font-semibold mb-2">Loading Company Data...</p>
              <p className="text-sm text-muted-foreground">
                Please wait while we fetch the company information.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="absolute top-4 left-4 z-10">
        <BackButton />
      </div>
      <header className="glass-header sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/super-admin-dashboard')}
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold text-primary">Company Monitor</h1>
          <p className="text-sm text-muted-foreground">Real-time activity monitoring for {company.name}</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Company Overview */}
          <div className="flex-1 space-y-6">
            {/* Company Info */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Company Overview
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => navigate(`/plant-view/${companyId}`)}
                      variant="outline"
                      size="sm"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Plant
                    </Button>
                    <Dialog open={showUserDetails} onOpenChange={setShowUserDetails}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Users className="mr-2 h-4 w-4" />
                          User Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-primary" />
                            User Details - {company?.name}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-6">
                          {/* Admin Details */}
                          {adminDetails && (
                            <div className="space-y-3">
                              <h3 className="text-lg font-semibold text-primary">Plant Admin</h3>
                              <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                                <CardContent className="p-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                                      <User className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                      <p className="font-semibold text-blue-900 dark:text-blue-100">
                                        {adminDetails.name || adminDetails.email}
                                      </p>
                                      <p className="text-sm text-blue-700 dark:text-blue-300">
                                        {adminDetails.email}
                                      </p>
                                      <Badge variant="secondary" className="mt-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                        Plant Admin
                                      </Badge>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          )}

                          {/* Users List */}
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-semibold text-primary">Users Created by This Admin</h3>
                              <Badge variant="outline" className="text-xs">
                                {companyUsers.length} user{companyUsers.length !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                            {companyUsers.length > 0 ? (
                              <div className="space-y-2">
                                {companyUsers.map((user, index) => (
                                  <Card key={index} className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                                    <CardContent className="p-4">
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                          <User className="h-4 w-4 text-white" />
                                        </div>
                                        <div>
                                          <p className="font-semibold text-green-900 dark:text-green-100">
                                            {user.name || user.email}
                                          </p>
                                          <p className="text-sm text-green-700 dark:text-green-300">
                                            {user.email}
                                          </p>
                                          <Badge variant="secondary" className="mt-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                            User
                                          </Badge>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            ) : (
                              <Card className="bg-gray-50 dark:bg-gray-900">
                                <CardContent className="p-4 text-center">
                                  <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                  <p className="text-gray-600 dark:text-gray-400">No users created by this admin yet</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                    Users will appear here when the admin creates them
                                  </p>
                                </CardContent>
                              </Card>
                            )}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button
                      onClick={handleDeleteCompany}
                      variant="destructive"
                      size="sm"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Company
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Total Tables</p>
                    <p className="text-2xl font-bold">{tables.length}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Total Panels</p>
                    <p className="text-2xl font-bold">{panels.length}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Plant Power</p>
                    <p className="text-2xl font-bold">{company.plantPowerKW} kW</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Panel Specs</p>
                    <p className="text-lg font-semibold">{company.panelVoltage}V/{company.panelCurrent}A</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activityLogs.length > 0 ? (
                  <div className="space-y-3">
                    {activityLogs.slice(0, 10).map((log) => (
                      <div key={log.id} className="flex items-start gap-3 p-3 bg-accent/20 rounded-lg">
                        <div className="flex-shrink-0 mt-1">
                          {getActionIcon(log.action)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={getActionColor(log.action)}>
                              {log.action.toUpperCase()}
                            </Badge>
                            <span className="font-semibold">{log.entityName}</span>
                            <span className="text-sm text-muted-foreground">({log.entityType})</span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">{log.details}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{formatTimestamp(log.timestamp)}</span>
                            <User className="h-3 w-3 ml-2" />
                            <span>{log.adminEmail}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No activity recorded yet
                  </p>
                )}
              </CardContent>
            </Card>

          </div>

          {/* Activity Summary Sidebar */}
          <div className="w-full lg:w-80 space-y-4">
            {/* Activity Summary */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">Activity Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Activities:</span>
                  <Badge variant="outline">{activityLogs.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Created:</span>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    {activityLogs.filter(log => log.action === 'create').length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Updated:</span>
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {activityLogs.filter(log => log.action === 'update').length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Deleted:</span>
                  <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                    {activityLogs.filter(log => log.action === 'delete').length}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Entity Summary */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">Entity Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Tables:</span>
                  <Badge variant="outline">
                    {activityLogs.filter(log => log.entityType === 'table').length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Panels:</span>
                  <Badge variant="outline">
                    {activityLogs.filter(log => log.entityType === 'panel').length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Users:</span>
                  <Badge variant="outline">
                    {activityLogs.filter(log => log.entityType === 'user').length}
                  </Badge>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </main>

      {/* Delete Company Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Company"
        description={`You are about to permanently delete the company "${company?.name}". This action will remove all company data, users, tables, and plant details.`}
        entityName={company?.name || ''}
        entityType="company"
        adminEmail={user?.email || ''}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default CompanyMonitor;
