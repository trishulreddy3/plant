import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LogOut, Building2, AlertCircle, AlertTriangle, Eye, Zap, Settings, Users, Plus, ArrowLeft } from 'lucide-react';
import { getCurrentUser, logout, getCompanies } from '@/lib/auth';
import { getTablesByCompany, getPanelsByCompany, Panel } from '@/lib/data';
import { getPlantDetails, getPanelHealthPercentage, getPanelStatus } from '@/lib/realFileSystem';
import Footer from '@/components/Footer';

interface UnifiedDashboardProps {
  userRole: 'super_admin' | 'plant_admin' | 'user';
  companyId?: string; // For super admin viewing specific company
  showBackButton?: boolean;
  backButtonText?: string;
  onBackClick?: () => void;
}

const UnifiedDashboard: React.FC<UnifiedDashboardProps> = ({
  userRole,
  companyId,
  showBackButton = false,
  backButtonText = 'Back',
  onBackClick
}) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(getCurrentUser());
  const [company, setCompany] = useState<any>(null);
  const [plantDetails, setPlantDetails] = useState<any>(null);
  const [tables, setTables] = useState<any[]>([]);
  const [panels, setPanels] = useState<Panel[]>([]);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      navigate('/');
      return;
    }
    
    // For super admin, use provided companyId or current user's companyId
    const targetCompanyId = userRole === 'super_admin' && companyId ? companyId : currentUser.companyId;
    
    if (!targetCompanyId) {
      navigate('/');
      return;
    }
    
    setUser({ ...currentUser, companyId: targetCompanyId });
  }, [navigate, userRole, companyId]);

  const loadData = useCallback(async () => {
    if (!user?.companyId) return;

    try {
      // Get company data from backend
      const { getAllCompanies } = await import('@/lib/realFileSystem');
      const backendCompanies = await getAllCompanies();
      const selectedCompany = backendCompanies.find(c => c.id === user.companyId);
      setCompany(selectedCompany);

      // Load plant details from file system
      const data = await getPlantDetails(user.companyId);
      setPlantDetails(data);
    } catch (error) {
      console.error('Error loading plant details:', error);
      setPlantDetails(null);
      
      // Fallback to localStorage
      const companies = getCompanies();
      const selectedCompany = companies.find(c => c.id === user.companyId);
      setCompany(selectedCompany);
    }

    const companyTables = getTablesByCompany(user.companyId);
    setTables(companyTables);

    const companyPanels = getPanelsByCompany(user.companyId);
    setPanels(companyPanels);
  }, [user?.companyId]);

  useEffect(() => {
    if (user?.companyId) {
      loadData();
      
      // Set up auto-refresh
      const interval = setInterval(loadData, 5000);
      return () => clearInterval(interval);
    }
  }, [user, loadData]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Function to get panel image based on realistic plant data
  const getPanelImage = (tableId: string, position: 'top' | 'bottom', panelIndex: number): string => {
    if (!plantDetails) return '/images/panels/image2.png';
    
    const healthPercentage = getPanelHealthPercentage(plantDetails, tableId, position, panelIndex);
    
    if (healthPercentage >= 100) {
      return '/images/panels/image1.png';
    } else if (healthPercentage >= 50) {
      return '/images/panels/image2.png';
    } else {
      return '/images/panels/image3.png';
    }
  };

  // Function to identify main culprit panels in series connection using realistic data
  const getMainCulpritPanels = () => {
    const culpritPanels: Array<{
      id: string;
      tableId: string;
      tableNumber: string;
      position: 'top' | 'bottom';
      panelNumber: string;
      status: string;
    }> = [];

    if (!plantDetails || !plantDetails.tables) return culpritPanels;

    plantDetails.tables.forEach((table: any) => {
      // Check top panels
      if (table.topPanels && table.topPanels.states) {
        table.topPanels.states.forEach((state: string, index: number) => {
          const healthPercentage = getPanelHealthPercentage(plantDetails, table.id, 'top', index);
          // Only show actually faulty panels (not just affected by series connection)
          if (state === 'fault' && healthPercentage < 20) {
            culpritPanels.push({
              id: `T.${table.serialNumber.split('-')[1]}.TOP.P${index + 1}`,
              tableId: table.id,
              tableNumber: table.serialNumber,
              position: 'top',
              panelNumber: `P${index + 1}`,
              status: 'Fault'
            });
          } else if (state === 'repairing' && healthPercentage >= 20 && healthPercentage < 80) {
            culpritPanels.push({
              id: `T.${table.serialNumber.split('-')[1]}.TOP.P${index + 1}`,
              tableId: table.id,
              tableNumber: table.serialNumber,
              position: 'top',
              panelNumber: `P${index + 1}`,
              status: 'Repairing'
            });
          }
        });
      }

      // Check bottom panels
      if (table.bottomPanels && table.bottomPanels.states) {
        table.bottomPanels.states.forEach((state: string, index: number) => {
          const healthPercentage = getPanelHealthPercentage(plantDetails, table.id, 'bottom', index);
          // Only show actually faulty panels (not just affected by series connection)
          if (state === 'fault' && healthPercentage < 20) {
            culpritPanels.push({
              id: `T.${table.serialNumber.split('-')[1]}.BOTTOM.P${index + 1}`,
              tableId: table.id,
              tableNumber: table.serialNumber,
              position: 'bottom',
              panelNumber: `P${index + 1}`,
              status: 'Fault'
            });
          } else if (state === 'repairing' && healthPercentage >= 20 && healthPercentage < 80) {
            culpritPanels.push({
              id: `T.${table.serialNumber.split('-')[1]}.BOTTOM.P${index + 1}`,
              tableId: table.id,
              tableNumber: table.serialNumber,
              position: 'bottom',
              panelNumber: `P${index + 1}`,
              status: 'Repairing'
            });
          }
        });
      }
    });

    return culpritPanels;
  };

  const culpritPanels = getMainCulpritPanels();
  const faultPanels = culpritPanels.filter(p => p.status === 'Fault');
  const repairingPanels = culpritPanels.filter(p => p.status === 'Repairing');

  if (!user || !company) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-primary">Loading Dashboard...</h2>
          <p className="text-muted-foreground">Please wait while we load your plant data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <header className="glass-header sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {showBackButton && (
                <Button
                  variant="ghost"
                  onClick={onBackClick}
                  className="mb-2"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {backButtonText}
                </Button>
              )}
              <div>
                <h1 className="text-2xl font-bold text-primary">
                  {user.companyName || 'Solar Plant'} - Solar Plant Monitor
                </h1>
                <p className="text-sm text-muted-foreground">
                  {userRole === 'super_admin' ? 'Super Admin View' : 
                   userRole === 'plant_admin' ? 'Plant Admin Dashboard' : 
                   userRole === 'management' ? 'Management Dashboard' :
                   userRole === 'technician' ? 'Technician Dashboard' :
                   'User Dashboard'} - {company.name}
                </p>
                {userRole && userRole !== 'super_admin' && userRole !== 'plant_admin' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Role: <span className="font-semibold capitalize">{userRole}</span>
                  </p>
                )}
              </div>
            </div>
            <Button onClick={handleLogout} variant="destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Dashboard Content */}
          <div className="flex-1 space-y-6">
            {/* Plant Overview */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Plant Overview - {company.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Total Tables</p>
                    <p className="text-2xl font-bold">{plantDetails?.tables?.length || 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Total Panels</p>
                    <p className="text-2xl font-bold">
                      {plantDetails?.tables?.reduce((sum: number, table: any) => 
                        sum + table.panelsTop + table.panelsBottom, 0) || 0}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Plant Power</p>
                    <p className="text-2xl font-bold">{plantDetails?.plantPowerKW || 0} kW</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Panel Specs</p>
                    <p className="text-lg font-semibold">
                      {plantDetails?.voltagePerPanel || 0}V/{plantDetails?.currentPerPanel || 0}A
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tables and Panels */}
            {plantDetails && plantDetails.tables && plantDetails.tables.length > 0 ? (
              <div className="space-y-6">
                {plantDetails.tables.map((table: any) => {
                  return (
                    <Card key={table.id} className="glass-card">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-primary" />
                            {table.serialNumber}
                          </div>
                          <Badge variant="outline">
                            {table.panelsTop + table.panelsBottom} panels ({table.panelsTop} top, {table.panelsBottom} bottom)
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {/* Top Panels Row */}
                        <div className="mb-4">
                          <div className="text-sm font-semibold text-muted-foreground mb-2">
                            Top Panels - Power: {table.topPanels.power.reduce((sum: number, p: number) => sum + p, 0).toFixed(1)}W
                          </div>
                          <div className="flex flex-wrap gap-0.5">
                            {table.topPanels.power.map((power: number, index: number) => {
                              const healthPercentage = getPanelHealthPercentage(plantDetails, table.id, 'top', index);
                              return (
                                <div key={`top-${index}`} className="relative">
                                  <img
                                    src={getPanelImage(table.id, 'top', index)}
                                    alt={`Panel P${index + 1} - ${power}W (${healthPercentage}%)`}
                                    className="w-20 h-16 object-contain"
                                    title={`P${index + 1}: ${power}W (${healthPercentage}%)`}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Separator Line */}
                        <div className="border-t border-border/50 my-4"></div>

                        {/* Bottom Panels Row */}
                        <div>
                          <div className="text-sm font-semibold text-muted-foreground mb-2">
                            Bottom Panels - Power: {table.bottomPanels.power.reduce((sum: number, p: number) => sum + p, 0).toFixed(1)}W
                          </div>
                          <div className="flex flex-wrap gap-0.5">
                            {table.bottomPanels.power.map((power: number, index: number) => {
                              const healthPercentage = getPanelHealthPercentage(plantDetails, table.id, 'bottom', index);
                              return (
                                <div key={`bottom-${index}`} className="relative">
                                  <img
                                    src={getPanelImage(table.id, 'bottom', index)}
                                    alt={`Panel P${index + 1} - ${power}W (${healthPercentage}%)`}
                                    className="w-20 h-16 object-contain"
                                    title={`P${index + 1}: ${power}W (${healthPercentage}%)`}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="glass-card">
                <CardContent className="text-center py-8">
                  <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Tables Found</h3>
                  <p className="text-muted-foreground">
                    {userRole === 'user' ? 
                      'No tables have been configured for this plant yet.' :
                      'No tables have been created for this plant yet.'
                    }
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:w-80 space-y-6">
            {/* Status Summary */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Status Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Panels:</span>
                  <Badge variant="outline">
                    {plantDetails?.tables?.reduce((sum: number, table: any) => 
                      sum + table.panelsTop + table.panelsBottom, 0) || 0}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Good Panels:</span>
                  <Badge variant="default" className="bg-green-500 text-green-900">
                    {(plantDetails?.tables?.reduce((sum: number, table: any) => 
                      sum + table.panelsTop + table.panelsBottom, 0) || 0) - faultPanels.length - repairingPanels.length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Fault Panels:</span>
                  <Badge variant="destructive">{faultPanels.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Under Repair:</span>
                  <Badge variant="secondary" className="bg-yellow-500 text-yellow-900">
                    {repairingPanels.length}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Fault Summary */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">Fault Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Fault Panels:</span>
                  <Badge variant="destructive">{faultPanels.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Under Repair:</span>
                  <Badge variant="secondary" className="bg-yellow-500 text-yellow-900">
                    {repairingPanels.length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Affected:</span>
                  <Badge variant="outline">{faultPanels.length + repairingPanels.length}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Fault Panels List */}
            {culpritPanels.length > 0 && (
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    Fault Panels
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {culpritPanels.map((panel) => (
                      <div key={panel.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <div>
                          <p className="text-sm font-semibold">{panel.id}</p>
                          <p className="text-xs text-muted-foreground">
                            {panel.tableNumber} - {panel.position} - {panel.panelNumber}
                          </p>
                        </div>
                        <Badge 
                          variant={panel.status === 'Fault' ? 'destructive' : 'secondary'}
                          className={panel.status === 'Repairing' ? 'bg-yellow-500 text-yellow-900' : ''}
                        >
                          {panel.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons (Only for Plant Admin) */}
            {userRole === 'plant_admin' && (
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-primary" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    onClick={() => navigate('/infrastructure')} 
                    className="w-full"
                    variant="outline"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Infrastructure
                  </Button>
                  <Button 
                    onClick={() => navigate('/existing-staff-members')} 
                    className="w-full"
                    variant="outline"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Manage Users
                  </Button>
                  <Button 
                    onClick={() => navigate('/add-table')} 
                    className="w-full"
                    variant="outline"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Table
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Read-Only Notice (For Users and Super Admin) */}
            {(userRole === 'user' || userRole === 'super_admin') && (
              <Card className="glass-card border-blue-200 bg-blue-50 dark:bg-blue-950">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                    <Eye className="h-4 w-4" />
                    <span className="text-sm font-semibold">
                      {userRole === 'super_admin' ? 'Super Admin View' : 'Read-Only Access'}
                    </span>
                  </div>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                    {userRole === 'super_admin' ? 
                      'You can monitor all plant data but cannot make changes from this view.' :
                      'You can monitor the solar plant but cannot make any changes. Contact your administrator for modifications.'
                    }
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <Footer userRole={userRole} />
    </div>
  );
};

export default UnifiedDashboard;
