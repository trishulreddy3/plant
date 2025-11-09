import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Activity, AlertCircle, CheckCircle, AlertTriangle, Edit, Trash2, LogOut, Plus } from 'lucide-react';
import { getCurrentUser, logout } from '@/lib/auth';
import { getTablesByCompany, getPanelsByCompany, updatePanelData, Panel, migratePanels, getPanels, savePanels, getTables, saveTables, addActivityLog } from '@/lib/data';
import { getCompanies } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { getAllCompanies, getPlantDetails, deletePanel, refreshPanelData, addPanels, setPanelCurrent } from '@/lib/realFileSystem';
 

interface UnifiedViewTablesProps {
  userRole: 'super_admin' | 'plant_admin' | 'user';
  companyId?: string; // For super admin viewing specific company
  showBackButton?: boolean;
  backButtonText?: string;
  onBackClick?: () => void;
  hideHeader?: boolean;
}

const UnifiedViewTables: React.FC<UnifiedViewTablesProps> = ({
  userRole,
  companyId,
  showBackButton = false,
  backButtonText = 'Back',
  onBackClick,
  hideHeader = false,
}) => {
  const LAZY_MODE = false;
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
  const [propagateSeries, setPropagateSeries] = useState<boolean>(true);
  const [showMakeFault, setShowMakeFault] = useState(false);
  const [mfTableId, setMfTableId] = useState<string>('');
  const [mfPosition, setMfPosition] = useState<'top'|'bottom'>('bottom');
  const [mfPanelIndex, setMfPanelIndex] = useState<number>(0);
  const [mfCurrent, setMfCurrent] = useState<string>('');
  const [expectedCurrent, setExpectedCurrent] = useState<number>(0);
  const [expectedVoltage, setExpectedVoltage] = useState<number>(0);

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

  // Lazy: do not auto-load or auto-refresh; user triggers loadData via button
  const [dataLoaded, setDataLoaded] = useState(false);
  useEffect(() => {
    if (!user?.companyId) return;
    if (LAZY_MODE && !dataLoaded) return;
    loadData();
  }, [user, dataLoaded]);

  const loadData = async () => {
    if (!user?.companyId) return;
    
    try {
      // Try to load from backend first
      const { getAllCompanies, getPlantDetails } = await import('@/lib/realFileSystem');
      const backendCompanies = await getAllCompanies();
      // Resolve by id or fallback to name match if id mismatch
      let selectedCompany = backendCompanies.find(c => c.id === user.companyId);
      if (!selectedCompany && user.companyId) {
        selectedCompany = backendCompanies.find(c => c.name?.toLowerCase() === user.companyId.toLowerCase());
      }
      
      if (selectedCompany) {
        // Load plant details from backend
        const plantDetails = await getPlantDetails(selectedCompany.id);
        if (plantDetails) {
          setTables(plantDetails.tables || []);
          setExpectedCurrent(plantDetails.currentPerPanel || 0);
          setExpectedVoltage(plantDetails.voltagePerPanel || 0);
          
          // Generate panels from plant details
          const generatedPanels: Panel[] = [];
          plantDetails.tables.forEach((table: any) => {
            // Top panels: respect backend states and actualFaultStatus
            for (let i = 0; i < table.panelsTop; i++) {
              const voltage = table.topPanels?.voltage?.[i] || plantDetails.voltagePerPanel;
              const current = table.topPanels?.current?.[i] || plantDetails.currentPerPanel;
              const power = voltage * current;
              const expectedPower = plantDetails.voltagePerPanel * plantDetails.currentPerPanel;
              const isActualFault = Array.isArray(table.topPanels?.actualFaultStatus) ? !!table.topPanels.actualFaultStatus[i] : false;
              const panelState: string | undefined = table.topPanels?.states?.[i];

              let status: 'good' | 'average' | 'fault' = 'good';
              if (isActualFault || panelState === 'fault' || panelState === 'repairing') {
                // Color affected (repairing) same as culprit for visual consistency
                status = 'fault';
              } else if (power < expectedPower * 0.95) {
                status = 'average';
              }

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
                status,
                lastUpdated: new Date().toISOString(),
              });
            }

            // Bottom panels: respect backend states and actualFaultStatus
            for (let i = 0; i < table.panelsBottom; i++) {
              const voltage = table.bottomPanels?.voltage?.[i] || plantDetails.voltagePerPanel;
              const current = table.bottomPanels?.current?.[i] || plantDetails.currentPerPanel;
              const power = voltage * current;
              const expectedPower = plantDetails.voltagePerPanel * plantDetails.currentPerPanel;
              const isActualFault = Array.isArray(table.bottomPanels?.actualFaultStatus) ? !!table.bottomPanels.actualFaultStatus[i] : false;
              const panelState: string | undefined = table.bottomPanels?.states?.[i];

              let status: 'good' | 'average' | 'fault' = 'good';
              if (isActualFault || panelState === 'fault' || panelState === 'repairing') {
                status = 'fault';
              } else if (power < expectedPower * 0.95) {
                status = 'average';
              }

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
                status,
                lastUpdated: new Date().toISOString(),
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
                lastUpdated: new Date().toISOString(),
                createdAt: new Date().toISOString(),
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
                lastUpdated: new Date().toISOString(),
                createdAt: new Date().toISOString(),
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

  // Function to get panel image based on status (good/average/fault)
  const getPanelImage = (panel: Panel): string => {
    switch (panel.status) {
      case 'good':
        return '/images/panels/image1.png';
      case 'average':
        return '/images/panels/image2.png';
      case 'fault':
      default:
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
      let prevWasGood = true;
      tablePanels.top.forEach((panel, index) => {
        const isBad = panel.status !== 'good';
        if (isBad && prevWasGood) {
          culpritPanels.push({
            id: `T.${tableNumber}.TOP.P${index + 1}`,
            tableId: panel.tableId,
            tableNumber: table.serialNumber,
            position: 'top',
            panelNumber: `P${index + 1}`,
            status: panel.status === 'fault' ? 'Fault' : 'Repairing'
          });
        }
        prevWasGood = !isBad;
      });

      // Check bottom panels for series faults
      prevWasGood = true;
      tablePanels.bottom.forEach((panel, index) => {
        const isBad = panel.status !== 'good';
        if (isBad && prevWasGood) {
          culpritPanels.push({
            id: `T.${tableNumber}.BOTTOM.P${index + 1}`,
            tableId: panel.tableId,
            tableNumber: table.serialNumber,
            position: 'bottom',
            panelNumber: `P${index + 1}`,
            status: panel.status === 'fault' ? 'Fault' : 'Repairing'
          });
        }
        prevWasGood = !isBad;
      });
    });

    return culpritPanels;
  };

  const culpritPanels = getMainCulpritPanels();
  const faultPanels = culpritPanels.filter(p => p.status === 'Fault');
  const repairingPanels = culpritPanels.filter(p => p.status === 'Repairing');
  // Series summary: count true culprits (one per series) and downstream affected
  const seriesSummary = (() => {
    let culprits = 0;
    let affected = 0;
    tables.forEach((t: any) => {
      const topIdx = typeof t.topPanels?.actualFaultyIndex === 'number' ? t.topPanels.actualFaultyIndex : -1;
      const bottomIdx = typeof t.bottomPanels?.actualFaultyIndex === 'number' ? t.bottomPanels.actualFaultyIndex : -1;
      if (topIdx >= 0) {
        culprits += 1;
        const len = t.panelsTop ?? (t.topPanels?.current?.length ?? 0);
        affected += Math.max(0, len - topIdx - 1);
      }
      if (bottomIdx >= 0) {
        culprits += 1;
        const len = t.panelsBottom ?? (t.bottomPanels?.current?.length ?? 0);
        affected += Math.max(0, len - bottomIdx - 1);
      }
    });
    return { culprits, affected };
  })();
  // Compute priority to fix: culprit whose series has the highest total power loss
  const priorityToFix = (() => {
    if (!expectedVoltage || !expectedCurrent) return null;
    const expectedPower = expectedVoltage * expectedCurrent; // per panel (W)
    let best: { id: string; label: string; lossKw: number } | null = null;
    culpritPanels.forEach(c => {
      const seriesPanels = panels.filter(p => p.tableId === c.tableId && p.position === c.position);
      const lossW = seriesPanels.reduce((sum, p) => sum + Math.max(0, expectedPower - p.powerGenerated), 0);
      const lossKw = Math.round((lossW / 1000) * 10) / 10;
      const label = `${c.id}/${lossKw}KW`;
      if (!best || lossKw > best.lossKw) {
        best = { id: c.id, label, lossKw };
      }
    });
    return best;
  })();
  const isTechnician = (user?.role === 'technician');

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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header - conditionally hidden */}
      {!hideHeader && (
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
                     'User Dashboard'} - Real-time panel status and performance
                  </p>
                  {userRole && userRole !== 'super_admin' && userRole !== 'plant_admin' && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Role: <span className="font-semibold capitalize">{userRole}</span>
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {LAZY_MODE && (
                  <Button variant="secondary" onClick={() => setDataLoaded(true)}>
                    {dataLoaded ? 'Refresh' : 'Load'} Plant
                  </Button>
                )}
                <Button onClick={handleLogout} variant="destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>
      )}

      <main className="container mx-auto px-4 py-6 flex-1 overflow-hidden">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px] h-full">
          {/* Main Content - EXACT SAME AS ViewTables */}
          <div className="flex flex-col gap-6 h-full overflow-hidden">
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
                    <p className="text-xl font-bold text-red-600">
                      {panels.filter(p => p.status === 'fault').length}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      culprit {seriesSummary.culprits}, affected {seriesSummary.affected}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tables and Panels - EXACT SAME AS ViewTables */}
            {tables.length > 0 ? (
              <div className="flex-1 overflow-auto space-y-6">
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
                            {topPanels.map((panel, idx) => (
                              <div
                                key={panel.id}
                                className={`relative transition-all hover:scale-105 cursor-pointer rounded-md border border-gray-300 bg-white shadow-sm ${
                                  userRole === 'plant_admin' && editingTableId === table.id ? 'ring-2 ring-red-500 ring-opacity-50' : ''
                                } ${panel.status === 'fault' ? 'bg-red-100 border-red-300' : ''} ${
                                  // Glow culprit: when index matches actualFaultyIndex
                                  (typeof table.topPanels?.actualFaultyIndex === 'number' && idx === table.topPanels.actualFaultyIndex)
                                    ? 'ring-4 ring-yellow-400 animate-pulse shadow-lg'
                                    : ''
                                }`}
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
                            {bottomPanels.map((panel, idx) => (
                              <div
                                key={panel.id}
                                className={`relative transition-all hover:scale-105 cursor-pointer rounded-md border border-gray-300 bg-white shadow-sm ${
                                  userRole === 'plant_admin' && editingTableId === table.id ? 'ring-2 ring-red-500 ring-opacity-50' : ''
                                } ${panel.status === 'fault' ? 'bg-red-100 border-red-300' : ''} ${
                                  (typeof table.bottomPanels?.actualFaultyIndex === 'number' && idx === table.bottomPanels.actualFaultyIndex)
                                    ? 'ring-4 ring-yellow-400 animate-pulse shadow-lg'
                                    : ''
                                }`}
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
          <div className="w-full lg:w-[360px] h-full overflow-auto space-y-6">
            {isTechnician && (
              <Card className="glass-card">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">Propagate series fault</div>
                    <input type="checkbox" checked={propagateSeries} onChange={(e)=> setPropagateSeries(e.target.checked)} />
                  </div>
                  <div className="mt-3">
                    <Button size="sm" onClick={()=> setShowMakeFault(true)}>Make Fault</Button>
                  </div>
                </CardContent>
              </Card>
            )}
            

            {/* Fault Panels with Dropdown - technicians only */}
            {isTechnician && (
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
                    let panelsToShow: typeof faultPanels = [];
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
                              className={`text-xs ${panel.status === 'Repairing' ? 'bg-yellow-500 text-yellow-900' : ''}`}
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
            )}

            {isTechnician && (
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Activity className="h-5 w-5 text-primary" />
                    Priority to Fix/Losses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {priorityToFix ? (
                    <p className="text-base font-extrabold text-orange-600">
                      {priorityToFix.label}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No losses detected</p>
                  )}
                </CardContent>
              </Card>
            )}

            {isTechnician && (
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Activity className="h-5 w-5 text-primary" />
                    Panel Currents (Issues)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const affected = panels.filter(p => p.status !== 'good');
                    return affected.length > 0 ? (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {affected.map((p) => (
                          <div key={p.id} className={`flex items-center justify-between p-2 rounded-lg border ${p.status === 'fault' ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800' : 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800'}`}>
                            <div>
                              <p className="text-sm font-semibold">{p.id}</p>
                              <p className="text-xs text-muted-foreground">{p.position.toUpperCase()} • {p.name}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold">{p.currentCurrent} A</p>
                              <Badge variant={p.status === 'fault' ? 'destructive' : 'secondary'} className={`text-xs ${p.status !== 'fault' ? 'bg-yellow-500 text-yellow-900' : ''}`}>
                                {p.status === 'fault' ? 'Fault' : 'Repairing'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No faulty or repairing panels</p>
                    );
                  })()}
                </CardContent>
              </Card>
            )}

            {/* Read-Only Notice (For Users and Super Admin) - not for technicians */}
            {(userRole === 'user' || userRole === 'super_admin') && !isTechnician && (
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
            <DialogDescription>
              Provide the number of panels and the side to add new panels to this table.
            </DialogDescription>
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
      
      {/* Make Fault Dialog (Technicians) */}
      <Dialog open={showMakeFault} onOpenChange={setShowMakeFault}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Make Fault (Testing)
            </DialogTitle>
            <DialogDescription>
              Select the target table, row and panel, then enter a current to simulate a fault.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Table</Label>
              <Select value={mfTableId} onValueChange={setMfTableId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select table" />
                </SelectTrigger>
                <SelectContent>
                  {tables.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.serialNumber}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Row</Label>
              <div className="flex gap-2">
                <Button variant={mfPosition==='top'?'default':'outline'} size="sm" onClick={()=> setMfPosition('top')} className="flex-1">Top</Button>
                <Button variant={mfPosition==='bottom'?'default':'outline'} size="sm" onClick={()=> setMfPosition('bottom')} className="flex-1">Bottom</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Panel</Label>
              <Select value={String(mfPanelIndex)} onValueChange={(v)=> setMfPanelIndex(parseInt(v,10))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select panel" />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    const t = tables.find(x => x.id === mfTableId);
                    const count = t ? (mfPosition==='top' ? t.panelsTop : t.panelsBottom) : 0;
                    const items = [] as JSX.Element[];
                    for (let i=0;i<count;i++) items.push(<SelectItem key={i} value={String(i)}>P{i+1}</SelectItem>);
                    return items;
                  })()}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Current (A)</Label>
              <Input
                type="number"
                step="0.1"
                value={mfCurrent}
                onChange={(e)=> setMfCurrent(e.target.value)}
                placeholder="e.g., 6.6"
              />
            </div>
            {/* Threshold guidance and live preview */}
            <div className="rounded-md border p-3 text-xs space-y-2 bg-muted/40">
              <div className="font-semibold">Health thresholds</div>
              <div>• Good: ≥ {expectedCurrent.toFixed(1)} A (≈ 100%)</div>
              <div>• Moderate: ≥ {(expectedCurrent*0.5).toFixed(1)} A and &lt; {expectedCurrent.toFixed(1)} A (≈ 50%–99%)</div>
              <div>• Fault: &lt; {(expectedCurrent*0.5).toFixed(1)} A (≈ &lt;50%)</div>
              {(() => {
                const v = parseFloat(mfCurrent);
                if (!Number.isFinite(v) || expectedCurrent <= 0) return null;
                const health = Math.round((v / expectedCurrent) * 100);
                let cat: 'good'|'average'|'fault' = 'good';
                if (health >= 100) cat = 'good'; else if (health >= 50) cat = 'average'; else cat = 'fault';
                return (
                  <div className="flex items-center justify-between pt-2">
                    <div>Preview: {health}% health</div>
                    <Badge variant={cat==='fault'?'destructive':(cat==='average'?'secondary':'default')} className={cat==='average'? 'bg-yellow-500 text-yellow-900':''}>
                      {cat === 'good' ? 'GOOD' : cat === 'average' ? 'MODERATE' : 'BAD'}
                    </Badge>
                  </div>
                );
              })()}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Propagate series fault</span>
              <input type="checkbox" checked={propagateSeries} onChange={(e)=> setPropagateSeries(e.target.checked)} />
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={()=> setShowMakeFault(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              className="flex-1 bg-yellow-600 hover:bg-yellow-700"
              onClick={async ()=>{
                if (!user?.companyId) return;
                if (!mfTableId) return;
                const v = parseFloat(mfCurrent);
                if (!Number.isFinite(v)) return;
                try {
                  await setPanelCurrent(user.companyId, mfTableId, mfPosition, mfPanelIndex, v, propagateSeries);
                  await loadData();
                  setShowMakeFault(false);
                  setMfCurrent('');
                } catch (e) {
                  console.error('Failed to make fault', e);
                }
              }}
            >Apply</Button>
          </div>
        </DialogContent>
      </Dialog>
      
      
    </div>
  );
};

export default UnifiedViewTables;
