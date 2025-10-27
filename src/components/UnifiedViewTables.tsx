import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Activity, AlertCircle, CheckCircle, AlertTriangle, Edit, Trash2, LogOut, Plus } from 'lucide-react';
import { getCurrentUser, logout } from '@/lib/auth';
import { getTablesByCompany, getPanelsByCompany, updatePanelData, Panel, migratePanels, getPanels, savePanels, getTables, saveTables, addActivityLog } from '@/lib/data';
import { getCompanies } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { getAllCompanies, getPlantDetails, deletePanel, refreshPanelData, addPanels } from '@/lib/realFileSystem';
import Footer from '@/components/Footer';

interface UnifiedViewTablesProps {
  userRole: 'super_admin' | 'plant_admin' | 'user';
  companyId?: string; // For super admin viewing specific company
  showBackButton?: boolean;
  backButtonText?: string;
  onBackClick?: () => void;
}

const UnifiedViewTables: React.FC<UnifiedViewTablesProps> = ({
  userRole,
  companyId,
  showBackButton = false,
  backButtonText = 'Back',
  onBackClick
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState(getCurrentUser());
  const [tables, setTables] = useState<any[]>([]);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [panelToDelete, setPanelToDelete] = useState<Panel | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [tableToDelete, setTableToDelete] = useState<any>(null);
  const [showDeleteTableDialog, setShowDeleteTableDialog] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showAddPanelDialog, setShowAddPanelDialog] = useState(false);
  const [addPanelData, setAddPanelData] = useState<{
    tableId: string;
    position: 'top' | 'bottom';
    panelCount: number;
  }>({ tableId: '', position: 'top', panelCount: 1 });
  const [faultPanelType, setFaultPanelType] = useState<'all' | 'fault' | 'repairing'>('all');

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

  useEffect(() => {
    if (user?.companyId) {
      loadData();

      // Continuous simulation: Auto-refresh panel data every 10-15 seconds
      const refreshPanelDataFunction = async () => {
        try {
          if (user?.companyId) {
            console.log('🔄 Refreshing panel data for simulation...');
            await refreshPanelData(user.companyId);
            // Reload data after refresh
            loadData();
          }
        } catch (error) {
          console.error('Error refreshing panel data:', error);
        }      
      };

      const interval = setInterval(() => {
        // Random refresh interval between 10-15 seconds for realistic simulation
        const delay = 10000 + Math.random() * 5000;
        setTimeout(refreshPanelDataFunction, delay);
      }, 15000); // Check every 15 seconds

      return () => clearInterval(interval);
    }
  }, [user]);

  const loadData = async () => {
    if (!user?.companyId) return;
    
    try {
      // Try to load from backend first
      const { getAllCompanies, getPlantDetails } = await import('@/lib/realFileSystem');
      const backendCompanies = await getAllCompanies();
      const selectedCompany = backendCompanies.find(c => c.id === user.companyId);
      
      if (selectedCompany) {
        // Load plant details from backend
        const plantDetails = await getPlantDetails(user.companyId);
        if (plantDetails) {
          setTables(plantDetails.tables || []);
          
          // Generate panels from plant details
          const generatedPanels: Panel[] = [];
          plantDetails.tables.forEach((table: any) => {
            // Top panels with backend simulation data
            for (let i = 0; i < table.panelsTop; i++) {
              const voltage = table.topPanels?.voltage?.[i] || plantDetails.voltagePerPanel;
              const current = table.topPanels?.current?.[i] || plantDetails.currentPerPanel;
              const power = voltage * current;
              
              // Calculate health percentage based on expected vs actual power
              const expectedPower = plantDetails.voltagePerPanel * plantDetails.currentPerPanel;
              const healthPercentage = Math.round((power / expectedPower) * 100);
              
              // Get panel state from backend simulation
              const panelState = table.topPanels?.states?.[i] || 'good';
              
              generatedPanels.push({
                id: `${table.id}-top-${i}`,
                tableId: table.id,
                companyId: user.companyId,
                name: `P${i + 1}`,
                position: 'top' as const,
                maxVoltage: 40,
                maxCurrent: 10,
                currentVoltage: Math.round(voltage * 10) / 10,
                currentCurrent: Math.round(current * 10) / 10,
                powerGenerated: Math.round(power * 10) / 10,
                status: healthPercentage >= 80 ? 'good' as const : 
                       healthPercentage >= 10 ? 'average' as const : 'fault' as const,
                healthPercentage,
                lastUpdated: new Date().toISOString(),
                createdAt: new Date().toISOString(),
              });
            }

            // Bottom panels with backend simulation data
            for (let i = 0; i < table.panelsBottom; i++) {
              const voltage = table.bottomPanels?.voltage?.[i] || plantDetails.voltagePerPanel;
              const current = table.bottomPanels?.current?.[i] || plantDetails.currentPerPanel;
              const power = voltage * current;
              
              // Calculate health percentage based on expected vs actual power
              const expectedPower = plantDetails.voltagePerPanel * plantDetails.currentPerPanel;
              const healthPercentage = Math.round((power / expectedPower) * 100);
              
              // Get panel state from backend simulation
              const panelState = table.bottomPanels?.states?.[i] || 'good';
              
              generatedPanels.push({
                id: `${table.id}-bottom-${i}`,
                tableId: table.id,
                companyId: user.companyId,
                name: `P${i + 1}`,
                position: 'bottom' as const,
                maxVoltage: 40,
                maxCurrent: 10,
                currentVoltage: Math.round(voltage * 10) / 10,
                currentCurrent: Math.round(current * 10) / 10,
                powerGenerated: Math.round(power * 10) / 10,
                status: healthPercentage >= 80 ? 'good' as const : 
                       healthPercentage >= 10 ? 'average' as const : 'fault' as const,
                healthPercentage,
                lastUpdated: new Date().toISOString(),
                createdAt: new Date().toISOString(),
              });
            }
          });
          
          setPanels(generatedPanels);
          return;
        }
      }
      
      // Fallback to localStorage if backend fails
      console.warn('Backend data not available, falling back to localStorage');
      const companyTables = getTablesByCompany(user.companyId);
      setTables(companyTables);

      const companyPanels = getPanelsByCompany(user.companyId);
      setPanels(companyPanels);
    } catch (error) {
      console.error('Error loading data:', error);
      
      // Fallback to localStorage
      const companyTables = getTablesByCompany(user.companyId);
      setTables(companyTables);

      const companyPanels = getPanelsByCompany(user.companyId);
      setPanels(companyPanels);
    }
  };

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

  const handleAddPanel = (tableId: string, position: 'top' | 'bottom') => {
    setAddPanelData({ tableId, position, panelCount: 1 });
    setShowAddPanelDialog(true);
  };

  const confirmAddPanel = async () => {
    if (!user || !addPanelData.tableId) return;

    try {
      const success = await addPanels(
        user.companyId, 
        addPanelData.tableId, 
        addPanelData.position, 
        addPanelData.panelCount
      );
      
      if (success) {
        toast({
          title: "Panels Added",
          description: `${addPanelData.panelCount} panel(s) added to ${addPanelData.position} side successfully.`,
          variant: "default",
        });
        
        // Reload data to reflect changes
        loadData();
        
        // Close dialog
        setShowAddPanelDialog(false);
        setAddPanelData({ tableId: '', position: 'top', panelCount: 1 });
      } else {
        toast({
          title: "Failed to Add Panels",
          description: "Failed to add panels. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error adding panels:', error);
      toast({
        title: "Error",
        description: "An error occurred while adding panels.",
        variant: "destructive",
      });
    }
  };

  const cancelAddPanel = () => {
    setShowAddPanelDialog(false);
    setAddPanelData({ tableId: '', position: 'top', panelCount: 1 });
  };

  // Function to calculate panel health percentage
  const getPanelHealthPercentage = (panel: Panel): number => {
    const maxPower = panel.maxVoltage * panel.maxCurrent; // Maximum possible power
    const currentPower = panel.powerGenerated; // Current power output
    const healthPercentage = (currentPower / maxPower) * 100;
    return Math.round(healthPercentage);
  };

  const toggleEditMode = (tableId: string) => {
    setEditingTableId(editingTableId === tableId ? null : tableId);
  };

  const handlePanelClick = (panel: Panel, tableId: string) => {
    if (editingTableId === tableId) {
      setPanelToDelete(panel);
      setShowDeleteDialog(true);
    }
  };

  const confirmDeletePanel = async () => {
    if (!panelToDelete || !user) return;

    try {
      // Delete panel from backend
      const success = await deletePanel(user.companyId, panelToDelete.id);
      
      if (success) {
        // Reload data from backend to reflect changes
        const plantDetails = await getPlantDetails(user.companyId);
        if (plantDetails) {
          setTables(plantDetails.tables || []);
          
          // Generate panels from backend plant details with realistic series data
          const generatedPanels: Panel[] = [];
          plantDetails.tables.forEach((table: any) => {
            // Top panels with realistic series connection behavior
            for (let i = 0; i < table.panelsTop; i++) {
              const voltage = table.topPanels?.voltage?.[i] || plantDetails.voltagePerPanel;
              const current = table.topPanels?.current?.[i] || plantDetails.currentPerPanel;
              const power = voltage * current;
              
              // Calculate health percentage based on expected vs actual power
              const expectedPower = plantDetails.voltagePerPanel * plantDetails.currentPerPanel;
              const healthPercentage = Math.round((power / expectedPower) * 100);
              
              // Get panel state from backend simulation
              const panelState = table.topPanels?.states?.[i] || 'good';
              const panelHealth = table.topPanels?.health?.[i] || healthPercentage;
              
              generatedPanels.push({
                id: `${table.id}-top-${i}`,
                tableId: table.id,
                companyId: user.companyId,
                name: `P${i + 1}`,
                position: 'top' as const,
                maxVoltage: 40,
                maxCurrent: 10,
                currentVoltage: Math.round(voltage * 10) / 10,
                currentCurrent: Math.round(current * 10) / 10,
                powerGenerated: Math.round(power * 10) / 10,
                status: healthPercentage >= 80 ? 'good' as const : 
                       healthPercentage >= 10 ? 'average' as const : 'fault' as const,
                healthPercentage,
                lastUpdated: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                state: panelState,
              });
            }
            
            // Bottom panels with realistic series connection behavior
            for (let i = 0; i < table.panelsBottom; i++) {
              const voltage = table.bottomPanels?.voltage?.[i] || plantDetails.voltagePerPanel;
              const current = table.bottomPanels?.current?.[i] || plantDetails.currentPerPanel;
              const power = voltage * current;
              
              // Calculate health percentage based on expected vs actual power
              const expectedPower = plantDetails.voltagePerPanel * plantDetails.currentPerPanel;
              const healthPercentage = Math.round((power / expectedPower) * 100);
              
              // Get panel state from backend simulation
              const panelState = table.bottomPanels?.states?.[i] || 'good';
              const panelHealth = table.bottomPanels?.health?.[i] || healthPercentage;
              
              generatedPanels.push({
                id: `${table.id}-bottom-${i}`,
                tableId: table.id,
                companyId: user.companyId,
                name: `P${i + 1}`,
                position: 'bottom' as const,
                maxVoltage: 40,
                maxCurrent: 10,
                currentVoltage: Math.round(voltage * 10) / 10,
                currentCurrent: Math.round(current * 10) / 10,
                powerGenerated: Math.round(power * 10) / 10,
                status: healthPercentage >= 80 ? 'good' as const : 
                       healthPercentage >= 10 ? 'average' as const : 'fault' as const,
                healthPercentage,
                lastUpdated: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                state: panelState,
              });
            }
          });
          
          setPanels(generatedPanels);
          
          toast({
            title: 'Panel Deleted',
            description: `Panel ${panelToDelete.name} has been successfully deleted.`,
          });
        }
      } else {
        toast({
          title: 'Delete Failed',
          description: 'Failed to delete panel. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting panel:', error);
      toast({
        title: 'Delete Failed',
        description: 'An error occurred while deleting the panel.',
        variant: 'destructive',
      });
    } finally {
      setShowDeleteDialog(false);
      setPanelToDelete(null);
    }
  };

  const cancelDeletePanel = () => {
    setShowDeleteDialog(false);
    setPanelToDelete(null);
  };

  // Function to get panel image based on health percentage
  const getPanelImage = (panel: Panel): string => {
    if (panel.healthPercentage >= 100) {
      return '/images/panels/image1.png';
    } else if (panel.healthPercentage >= 50) {
      return '/images/panels/image2.png';
    } else {
      return '/images/panels/image3.png';
    }
  };

  // Function to identify main culprit panels in series connection
  const getMainCulpritPanels = () => {
    const culpritPanels: Array<{
      id: string;
      tableId: string;
      tableNumber: string;
      position: 'top' | 'bottom';
      panelNumber: string;
      status: string;
    }> = [];

    // Group panels by table and position
    const panelsByTable = panels.reduce((acc, panel) => {
      if (!acc[panel.tableId]) {
        acc[panel.tableId] = { top: [], bottom: [] };
      }
      acc[panel.tableId][panel.position].push(panel);
      return acc;
    }, {} as Record<string, { top: Panel[]; bottom: Panel[] }>);

    // Check each table for series connection issues
    Object.entries(panelsByTable).forEach(([tableId, tablePanels]) => {
      const table = tables.find(t => t.id === tableId);
      if (!table) return;

      const tableNumber = table.serialNumber.split('-')[1] || '1';

      // Check top panels for series faults
      let lastGoodIndex = -1;
      tablePanels.top.forEach((panel, index) => {
        if (panel.status === 'fault' || panel.status === 'average') {
          if (lastGoodIndex === index - 1) {
            culpritPanels.push({
              id: `T.${tableNumber}.TOP.P${index + 1}`,
              tableId: panel.tableId,
              tableNumber: table.serialNumber,
              position: 'top',
              panelNumber: `P${index + 1}`,
              status: panel.status === 'fault' ? 'Fault' : 'Repairing'
            });
          }
          lastGoodIndex = index;
        } else {
          lastGoodIndex = index;
        }
      });

      // Check bottom panels for series faults
      lastGoodIndex = -1;
      tablePanels.bottom.forEach((panel, index) => {
        if (panel.status === 'fault' || panel.status === 'average') {
          if (lastGoodIndex === index - 1) {
            culpritPanels.push({
              id: `T.${tableNumber}.BOTTOM.P${index + 1}`,
              tableId: panel.tableId,
              tableNumber: table.serialNumber,
              position: 'bottom',
              panelNumber: `P${index + 1}`,
              status: panel.status === 'fault' ? 'Fault' : 'Repairing'
            });
          }
          lastGoodIndex = index;
        } else {
          lastGoodIndex = index;
        }
      });
    });

    return culpritPanels;
  };

  const culpritPanels = getMainCulpritPanels();
  const faultPanels = culpritPanels.filter(p => p.status === 'Fault');
  const repairingPanels = culpritPanels.filter(p => p.status === 'Repairing');

  if (!user) {
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
      {/* Header - EXACT SAME AS ViewTables */}
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
                  Solar Panel Monitoring - {user.companyName || 'Plant'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {userRole === 'super_admin' ? 'Super Admin View' : 
                   userRole === 'plant_admin' ? 'Plant Admin Dashboard' : 
                   userRole === 'management' ? 'Management Dashboard' :
                   userRole === 'technician' ? 'Technician Dashboard' :
                   'User Dashboard'} - Real-time panel status and performance
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
          {/* Main Content - EXACT SAME AS ViewTables */}
          <div className="flex-1 space-y-6">
            {/* Status Overview - EXACT SAME AS ViewTables */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Plant Status Overview
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
                    <p className="text-sm text-muted-foreground">Good Panels</p>
                    <p className="text-2xl font-bold text-green-600">
                      {panels.filter(p => p.status === 'good').length}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Fault Panels</p>
                    <p className="text-2xl font-bold text-red-600">
                      {panels.filter(p => p.status === 'fault').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tables and Panels - EXACT SAME AS ViewTables */}
            {tables.length > 0 ? (
              <div className="space-y-6">
                {tables.map((table) => {
                  const tablePanels = panels.filter(p => p.tableId === table.id);
                  const topPanels = tablePanels.filter(p => p.position === 'top');
                  const bottomPanels = tablePanels.filter(p => p.position === 'bottom');

                  return (
                    <Card key={table.id} className="glass-card">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-primary" />
                            {table.serialNumber}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {topPanels.length + bottomPanels.length} panels
                            </Badge>
                            {userRole === 'plant_admin' && (
                              <Button
                                variant={editingTableId === table.id ? "destructive" : "outline"}
                                size="sm"
                                onClick={() => toggleEditMode(table.id)}
                                className="h-8"
                              >
                                {editingTableId === table.id ? (
                                  <>
                                    <Edit className="h-3 w-3 mr-1" />
                                    Exit Edit
                                  </>
                                ) : (
                                  <>
                                    <Edit className="h-3 w-3 mr-1" />
                                    Edit
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {/* Top Panels Row */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-semibold text-muted-foreground">
                              Top Panels
                              {userRole === 'plant_admin' && editingTableId === table.id && (
                                <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                                  Edit Mode - Click panels to delete
                                </span>
                              )}
                            </div>
                            {userRole === 'plant_admin' && editingTableId === table.id && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAddPanel(table.id, 'top')}
                                className="h-6 px-2 text-xs"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add Panel
                              </Button>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {topPanels.map((panel) => (
                              <div
                                key={panel.id}
                                className={`relative transition-all hover:scale-105 cursor-pointer rounded-md border border-gray-300 bg-white shadow-sm ${
                                  userRole === 'plant_admin' && editingTableId === table.id ? 'ring-2 ring-red-500 ring-opacity-50' : ''
                                } ${panel.status === 'fault' ? 'bg-red-100 border-red-300' : ''}`}
                                onClick={() => userRole === 'plant_admin' ? handlePanelClick(panel, table.id) : undefined}
                                style={{
                                  width: '32px',
                                  height: '40px',
                                  borderRadius: '6px'
                                }}
                              >
                                <img
                                  src={getPanelImage(panel)}
                                  alt={`Panel ${panel.name} - Health ${getPanelHealthPercentage(panel)}%`}
                                  className="w-full h-full object-cover"
                                  style={{ borderRadius: '4px' }}
                                />
                                {/* Edit mode indicator */}
                                {userRole === 'plant_admin' && editingTableId === table.id && (
                                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs p-0.5 rounded-full">
                                    <Trash2 className="h-2 w-2" />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Separator Line */}
                        <div className="relative my-4">
                          <div className="h-px bg-blue-300"></div>
                        </div>

                        {/* Bottom Panels Row */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-semibold text-muted-foreground">
                              Bottom Panels
                              {userRole === 'plant_admin' && editingTableId === table.id && (
                                <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                                  Edit Mode - Click panels to delete
                                </span>
                              )}
                            </div>
                            {userRole === 'plant_admin' && editingTableId === table.id && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAddPanel(table.id, 'bottom')}
                                className="h-6 px-2 text-xs"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add Panel
                              </Button>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {bottomPanels.map((panel) => (
                              <div
                                key={panel.id}
                                className={`relative transition-all hover:scale-105 cursor-pointer rounded-md border border-gray-300 bg-white shadow-sm ${
                                  userRole === 'plant_admin' && editingTableId === table.id ? 'ring-2 ring-red-500 ring-opacity-50' : ''
                                } ${panel.status === 'fault' ? 'bg-red-100 border-red-300' : ''}`}
                                onClick={() => userRole === 'plant_admin' ? handlePanelClick(panel, table.id) : undefined}
                                style={{
                                  width: '32px',
                                  height: '40px',
                                  borderRadius: '6px'
                                }}
                              >
                                <img
                                  src={getPanelImage(panel)}
                                  alt={`Panel ${panel.name} - Health ${getPanelHealthPercentage(panel)}%`}
                                  className="w-full h-full object-cover"
                                  style={{ borderRadius: '4px' }}
                                />
                                {/* Edit mode indicator */}
                                {userRole === 'plant_admin' && editingTableId === table.id && (
                                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs p-0.5 rounded-full">
                                    <Trash2 className="h-2 w-2" />
                                  </div>
                                )}
                              </div>
                            ))}
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
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
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

          {/* Sidebar - EXACT SAME AS ViewTables */}
          <div className="lg:w-80 space-y-6">
            {/* Status Summary */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Status Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Panels:</span>
                  <Badge variant="outline">{panels.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Good Panels:</span>
                  <Badge variant="default" className="bg-green-500 text-green-900">
                    {panels.filter(p => p.status === 'good').length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Average Panels:</span>
                  <Badge variant="secondary" className="bg-yellow-500 text-yellow-900">
                    {panels.filter(p => p.status === 'average').length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Fault Panels:</span>
                  <Badge variant="destructive">{panels.filter(p => p.status === 'fault').length}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Fault Summary */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  Fault Summary
                </CardTitle>
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

            {/* Fault Panels with Dropdown */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  Panel Status
                </CardTitle>
                <div className="mt-2">
                  <Select value={faultPanelType} onValueChange={(value: 'all' | 'fault' | 'repairing') => setFaultPanelType(value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select panel type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Faulty Panels ({faultPanels.length + repairingPanels.length})</SelectItem>
                      <SelectItem value="fault">Fault Panels ({faultPanels.length})</SelectItem>
                      <SelectItem value="repairing">Repairing Panels ({repairingPanels.length})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {(() => {
                  let panelsToShow = [];
                  let panelType = '';
                  
                  if (faultPanelType === 'all') {
                    panelsToShow = [...faultPanels, ...repairingPanels];
                    panelType = 'All Faulty';
                  } else if (faultPanelType === 'fault') {
                    panelsToShow = faultPanels;
                    panelType = 'Fault';
                  } else {
                    panelsToShow = repairingPanels;
                    panelType = 'Repairing';
                  }

                  return panelsToShow.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {panelsToShow.map((panel) => (
                        <div
                          key={panel.id}
                          className={`flex items-center justify-between p-2 rounded-lg border ${
                            panel.status === 'Fault' 
                              ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                              : 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800'
                          }`}
                        >
                          <div>
                            <p className="text-sm font-semibold">{panel.id}</p>
                            <p className="text-xs text-muted-foreground">
                              {panel.tableNumber} - {panel.position} - {panel.panelNumber}
                            </p>
                          </div>
                          <Badge 
                            variant={panel.status === 'Fault' ? 'destructive' : 'secondary'} 
                            className={`text-xs ${
                              panel.status === 'Repairing' ? 'bg-yellow-500 text-yellow-900' : ''
                            }`}
                          >
                            {panel.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No {panelType.toLowerCase()} panels detected
                    </p>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Read-Only Notice (For Users and Super Admin) */}
            {(userRole === 'user' || userRole === 'super_admin') && (
              <Card className="glass-card border-blue-200 bg-blue-50 dark:bg-blue-950">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                    <AlertCircle className="h-4 w-4" />
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

      {/* Delete Panel Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Panel</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete panel {panelToDelete?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDeletePanel}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePanel} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Panel Dialog */}
      <Dialog open={showAddPanelDialog} onOpenChange={setShowAddPanelDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-green-600" />
              Add Panels
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="panel-count">Number of panels to add:</Label>
              <Input
                id="panel-count"
                type="number"
                min="1"
                max="20"
                value={addPanelData.panelCount}
                onChange={(e) => setAddPanelData(prev => ({ 
                  ...prev, 
                  panelCount: Math.max(1, Math.min(20, parseInt(e.target.value) || 1))
                }))}
                placeholder="Enter number of panels"
              />
            </div>
            <div className="space-y-2">
              <Label>Position:</Label>
              <div className="flex gap-2">
                <Button
                  variant={addPanelData.position === 'top' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAddPanelData(prev => ({ ...prev, position: 'top' }))}
                  className="flex-1"
                >
                  Top Side
                </Button>
                <Button
                  variant={addPanelData.position === 'bottom' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAddPanelData(prev => ({ ...prev, position: 'bottom' }))}
                  className="flex-1"
                >
                  Bottom Side
                </Button>
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> Adding {addPanelData.panelCount} panel(s) to the {addPanelData.position} side will increase the total panel count for this table.
              </p>
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={cancelAddPanel} className="flex-1">
              Cancel
            </Button>
            <Button onClick={confirmAddPanel} className="flex-1 bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Panels
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Footer */}
      <Footer userRole={userRole} />
    </div>
  );
};

export default UnifiedViewTables;
