import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LogOut, Building2, AlertCircle, AlertTriangle, Eye, Zap, Settings, Users, Plus, ArrowLeft } from 'lucide-react';
import { getCurrentUser, logout, getCompanies } from '@/lib/auth';
import { getTablesByCompany, getPanelsByCompany, Panel } from '@/lib/data';
import { getPlantDetails, getPanelHealthPercentage, getPanelStatus } from '@/lib/realFileSystem';


interface UnifiedDashboardProps {
  userRole: 'super_admin' | 'plant_admin' | 'technician' | 'management' | 'user';
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
      let selectedCompany = backendCompanies.find(c => c.id === user.companyId);

      if (!selectedCompany && user.companyName) {
        selectedCompany = backendCompanies.find(c => c.name?.toLowerCase() === user.companyName?.toLowerCase());
      }

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
  const getPanelImage = (tableId: string, panelIndex: number): string => {
    if (!plantDetails) return '/images/panels/image2.png';

    const healthPercentage = getPanelHealthPercentage(plantDetails, tableId, undefined, panelIndex);

    if (healthPercentage >= 98) {
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
      position: string;
      panelNumber: string;
      status: string;
    }> = [];

    if (!plantDetails || !plantDetails.tables) return culpritPanels;

    plantDetails.tables.forEach((table: any) => {
      const voltages = table.panelVoltages || [];
      voltages.forEach((voltage: number, index: number) => {
        const healthPercentage = getPanelHealthPercentage(plantDetails, table.id, undefined, index);

        // Status Logic matching getPanelStatus from lib
        // < 50% -> Bad/Fault
        // 50-98% -> Moderate (Repairing/Warning)

        if (healthPercentage < 50) {
          culpritPanels.push({
            id: `${table.node || table.serialNumber}.P${index + 1}`,
            tableId: table.id,
            tableNumber: table.node || table.serialNumber,
            position: 'Main',
            panelNumber: `P${index + 1}`,
            status: 'Fault'
          });
        } else if (healthPercentage < 98) {
          culpritPanels.push({
            id: `${table.node || table.serialNumber}.P${index + 1}`,
            tableId: table.id,
            tableNumber: table.node || table.serialNumber,
            position: 'Main',
            panelNumber: `P${index + 1}`,
            status: 'Repairing' // Or Moderate
          });
        }
      });
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
                        sum + (table.panelCount || table.panelVoltages?.length || (table.panelsTop || 0) + (table.panelsBottom || 0) || 0), 0) || 0}
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
                  const panelVoltages = table.panelVoltages || [];
                  const totalPower = panelVoltages.reduce((sum: number, v: number) => sum + (v * (plantDetails.currentPerPanel || 0)), 0);
                  // Approximate power calculation (Voltage * Current)

                  return (
                    <div key={table.id} className="flex items-center gap-4 p-4 bg-white/50 border border-white/40 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                      {/* Node ID Section */}
                      <div className="flex-shrink-0 w-32">
                        <div className="bg-slate-100 text-slate-800 border border-slate-200 shadow-sm rounded-lg px-3 py-2 font-semibold text-lg text-center tracking-tight">
                          {table.node || table.serialNumber || 'Node'}
                        </div>
                        <div className="mt-1 text-center">
                          <Badge variant="outline" className="text-[10px] h-4 px-1 bg-white/50 border-slate-200">
                            {totalPower.toFixed(0)}W
                          </Badge>
                        </div>
                      </div>

                      {/* Panels Scrollable Row */}
                      <div className="flex-1 min-w-0">
                        <div className="flex gap-2 pb-2 overflow-x-auto custom-scrollbar">
                          {panelVoltages.map((voltage: number, index: number) => {
                            const healthPercentage = getPanelHealthPercentage(plantDetails, table.id, undefined, index);
                            const power = (voltage * (plantDetails.currentPerPanel || 10)).toFixed(1);

                            return (
                              <div key={`p-${index}`} className="flex-shrink-0 flex flex-col items-center group cursor-pointer transition-transform duration-200 hover:-translate-y-1" title={`P${index + 1}: ${power}W (${healthPercentage}%)`}>
                                <div className="w-8 h-12 border border-slate-200 rounded-md flex items-center justify-center overflow-hidden relative bg-slate-100 shadow-sm">
                                  <img
                                    src={getPanelImage(table.id, index)}
                                    alt={`Panel P${index + 1}`}
                                    className="absolute inset-0 w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-x-0 bottom-0 bg-black/60 py-[1px] flex justify-center backdrop-blur-[1px]">
                                    <span className="text-[6px] font-bold text-white leading-none tracking-tight">{voltage.toFixed(1)}V</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          {panelVoltages.length === 0 && (
                            <div className="text-xs text-muted-foreground italic py-2 pl-2">No panels.</div>
                          )}
                        </div>
                      </div>
                    </div>
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
            {/* Status Summary - technicians only */}
            {userRole === 'technician' && (
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
                        sum + (table.panelCount || table.panelVoltages?.length || (table.panelsTop || 0) + (table.panelsBottom || 0) || 0), 0) || 0}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Good Panels:</span>
                    <Badge variant="default" className="bg-green-500 text-green-900">
                      {(plantDetails?.tables?.reduce((sum: number, table: any) =>
                        sum + (table.panelCount || table.panelVoltages?.length || (table.panelsTop || 0) + (table.panelsBottom || 0) || 0), 0) || 0) - faultPanels.length - repairingPanels.length}
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
            )}

            {/* Fault Summary - technicians only */}
            {userRole === 'technician' && (
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
            )}

            {/* Fault Panels List - technicians only */}
            {userRole === 'technician' && culpritPanels.length > 0 && (
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


    </div>
  );
};

export default UnifiedDashboard;
