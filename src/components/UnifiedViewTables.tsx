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
import { getAllCompanies, getPlantDetails, deletePanel, refreshPanelData, addPanels, setPanelCurrent, getNodeFaultStatus } from '@/lib/realFileSystem';


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
  const [nodeFaultStatusData, setNodeFaultStatusData] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
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
  const [mfPosition, setMfPosition] = useState<'top' | 'bottom'>('bottom');
  const [mfPanelIndex, setMfPanelIndex] = useState<number>(0);
  const [mfCurrent, setMfCurrent] = useState<string>('');
  const [mfVoltage, setMfVoltage] = useState<string>('');
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
  // Dynamic Updates: Poll for backend changes every 10 seconds
  useEffect(() => {
    const targetId = companyId || user?.companyId;
    if (!targetId) return;
    if (LAZY_MODE && !dataLoaded) return;

    // Initial load
    loadData();

    const interval = setInterval(() => {
      loadData();
    }, 5000); // 5 seconds

    return () => clearInterval(interval);
  }, [user, companyId, dataLoaded]);

  const [lastRefreshed, setLastRefreshed] = useState<string>(new Date().toLocaleTimeString());

  useEffect(() => {
    if (panels.length > 0) {
      setLastRefreshed(new Date().toLocaleTimeString());
    }
  }, [panels]);

  // Sync voltage with current defaults
  useEffect(() => {
    if (mfCurrent && expectedCurrent > 0 && expectedVoltage > 0) {
      const c = parseFloat(mfCurrent);
      if (!isNaN(c)) {
        const ratio = c / expectedCurrent;
        setMfVoltage((expectedVoltage * ratio).toFixed(1));
      }
    } else if (!mfCurrent) {
      setMfVoltage('');
    }
  }, [mfCurrent, expectedCurrent, expectedVoltage]);

  const loadData = async () => {
    const targetId = companyId || user?.companyId;
    console.log('[UnifiedViewTables] loadData start. targetId:', targetId);
    if (!targetId) return;

    try {
      const backendCompanies = await getAllCompanies();
      console.log('[UnifiedViewTables] Found companies:', backendCompanies.length);

      // Resolve by id or fallback to name match if id mismatch
      let selectedCompany = backendCompanies.find(c => c.id === targetId);
      if (!selectedCompany && targetId) {
        selectedCompany = backendCompanies.find(c => c.name?.toLowerCase() === targetId.toLowerCase());
      }

      if (selectedCompany) {
        console.log('[UnifiedViewTables] Selected company:', selectedCompany.name, 'id:', selectedCompany.id);
        // Load plant details from backend
        const plantDetails = await getPlantDetails(selectedCompany.id);
        console.log('[UnifiedViewTables] plantDetails results:', !!plantDetails);

        if (plantDetails) {
          console.log('[UnifiedViewTables] live_data count:', plantDetails.live_data?.length);
          const tableList = (plantDetails.live_data || []).map((t: any) => ({
            ...t,
            id: t.id || t.node || t.serialNumber || `tbl-${Math.random()}`
          }));
          setTables(tableList);
          if (!mfTableId && tableList.length > 0) {
            setMfTableId(tableList[0].id);
          }
          setExpectedCurrent(plantDetails.currentPerPanel || 0);
          setExpectedVoltage(plantDetails.voltagePerPanel || 0);

          // Fetch Node Fault Status for the table view
          try {
            const faultRes = await getNodeFaultStatus(selectedCompany.id);
            if (faultRes) {
              setNodeFaultStatusData(faultRes);
            }
          } catch (err) {
            console.error('Failed to load node fault status', err);
          }

          // Generate panels from plant details (New Flat Schema)
          const generatedPanels: Panel[] = [];

          (plantDetails.live_data || []).forEach((table: any) => {
            // Handle legacy data gracefully or strict new schema
            const vs = table.panelVoltages || [];
            // If legacy top/bottom exist, migrator logic would be needed, but we assume new schema now.

            const vpp = plantDetails.voltagePerPanel || 20;
            vs.forEach((vol: number, i: number) => {
              const voltageHealth = (vol / vpp) * 100;
              let status: 'good' | 'average' | 'fault' = 'good';
              if (voltageHealth < 50) status = 'fault';
              else if (voltageHealth < 98) status = 'average'; // 98% because variation is small

              generatedPanels.push({
                id: `${table.serialNumber || table.node}-P${i + 1}`,
                tableId: table.id || table.node || table.serialNumber,
                companyId: user.companyId,
                name: `P${i + 1}`,
                // Legacy props for interface compat
                position: i < (table.panelsTop || vs.length / 2) ? 'top' : 'bottom',
                maxVoltage: 40,
                maxCurrent: 10,
                currentVoltage: vol,
                currentCurrent: table.current || 0, // Table-wide limiting current
                powerGenerated: vol * (table.current || 0),
                status: status,
                lastUpdated: table.time || new Date().toISOString()
              });
            });
          });

          setPanels(generatedPanels);
          return;
        }
      }

      // Fallback removed as backend is primary source of truth now
    } catch (error) {
      console.error('Error loading data:', error);
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
    } else if (isTechnician || userRole === 'plant_admin') {
      // For technicians or admins, clicking a panel pre-fills and opens the Make Fault dialog
      setMfTableId(tableId);
      setMfPosition(panel.position);
      // Extra logic to find the index: we'll match by panel name "P1", "P2" etc
      const idx = parseInt(panel.name.substring(1)) - 1;
      setMfPanelIndex(isNaN(idx) ? 0 : idx);
      setMfCurrent('');
      setMfVoltage('');
      setShowMakeFault(true);
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
          setTables(plantDetails.live_data || []);

          // Generate panels from backend plant details with realistic series data
          const generatedPanels: Panel[] = [];
          (plantDetails.live_data || []).forEach((table: any) => {
            const vs = table.panelVoltages || [];
            const vpp = plantDetails.voltagePerPanel || 20;
            const topCount = table.panelsTop || Math.ceil(vs.length / 2);

            vs.forEach((vol: number, i: number) => {
              const voltageHealth = (vol / vpp) * 100;
              let status: 'good' | 'average' | 'fault' = 'good';
              if (voltageHealth < 50) status = 'fault';
              else if (voltageHealth < 98) status = 'average';

              generatedPanels.push({
                id: `${table.serialNumber || table.node}-P${i + 1}`,
                tableId: table.id,
                companyId: user.companyId,
                name: `P${i + 1}`,
                position: i < topCount ? 'top' : 'bottom',
                maxVoltage: 40,
                maxCurrent: 10,
                currentVoltage: vol,
                currentCurrent: table.current || 0,
                powerGenerated: vol * (table.current || 0),
                status: status,
                lastUpdated: table.time || new Date().toISOString()
              });
            });
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
    return [];
  };

  const culpritPanels = getMainCulpritPanels();
  const faultPanels = [];
  const repairingPanels = [];

  // Series summary
  const seriesSummary = { culprits: 0, affected: 0 };
  const priorityToFix = null;

  const systemMetrics = (() => {
    let totalPower = 0;
    let totalCurrent = 0;
    let tableVoltages: number[] = [];

    tables.forEach(table => {
      // Calculate Table Voltage (sum of panel voltages)
      const tablePanels = panels.filter(p => p.tableId === table.id);
      const tableVoltage = tablePanels.reduce((sum, p) => sum + p.currentVoltage, 0);
      const tableCurrent = table.current || 0;

      const pTable = tableVoltage * tableCurrent;
      totalPower += pTable;
      totalCurrent += tableCurrent;

      if (tableVoltage > 0) {
        tableVoltages.push(tableVoltage);
      }
    });

    const avgVoltage = tableVoltages.length > 0 ? tableVoltages.reduce((a, b) => a + b, 0) / tableVoltages.length : 0;

    // Real-world factors (Industry standards)
    const efficiency = 0.18; // 18% panel efficiency
    const tempLoss = 0.04;    // 4% temperature-induced loss
    const sysLoss = 0.03;     // 3% Inverter & Wiring loss

    const netPower = totalPower * (1 - tempLoss) * (1 - sysLoss);

    return {
      totalVoltage: avgVoltage.toFixed(1),
      totalCurrent: totalCurrent.toFixed(1),
      grossPower: (totalPower / 1000).toFixed(2), // kW
      netPower: (netPower / 1000).toFixed(2),     // kW
      efficiency: (efficiency * 100).toFixed(0),
      totalLoss: ((1 - (1 - tempLoss) * (1 - sysLoss)) * 100).toFixed(1)
    };
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
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm text-muted-foreground whitespace-nowrap">
                      {userRole === 'super_admin' ? 'Super Admin View' :
                        userRole === 'plant_admin' ? 'Plant Admin Dashboard' :
                          'User Dashboard'}
                    </p>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-50 border border-green-100">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[10px] font-medium text-green-700 uppercase tracking-wider">Live Updates: {lastRefreshed}</span>
                    </div>
                  </div>
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

      <main className="container mx-auto px-4 py-6 flex-1 flex flex-col min-h-0">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px] flex-1">
          {/* Main Content - EXACT SAME AS ViewTables */}
          <div className="flex flex-col gap-6 overflow-hidden min-h-0">
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
                    <p className="text-sm text-muted-foreground">Faulty Culprits</p>
                    <p className="text-xl font-bold text-red-600">
                      {culpritPanels.length}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {seriesSummary.affected} panels affected by series
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Advanced Solar Calculations - Dynamic System Metrics */}
            <Card className="glass-card border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  System Performance & Real-time Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase font-semibold">Total Voltage</p>
                    <p className="text-xl font-bold">{systemMetrics.totalVoltage} V</p>
                    <p className="text-[10px] text-muted-foreground">Series Avg/Table</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase font-semibold">Total Current</p>
                    <p className="text-xl font-bold">{systemMetrics.totalCurrent} A</p>
                    <p className="text-[10px] text-muted-foreground">Parallel Combined</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase font-semibold">Gross Power</p>
                    <p className="text-xl font-bold text-primary">{systemMetrics.grossPower} kW</p>
                    <p className="text-[10px] text-muted-foreground">Raw Output (W)</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase font-semibold">Net Power</p>
                    <p className="text-xl font-bold text-green-600">{systemMetrics.netPower} kW</p>
                    <p className="text-[10px] text-muted-foreground">Incl. Losses</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase font-semibold">Efficiency</p>
                    <p className="text-xl font-bold text-blue-600">{systemMetrics.efficiency}%</p>
                    <p className="text-[10px] text-muted-foreground">Panel Rating</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase font-semibold">Total Loss</p>
                    <p className="text-xl font-bold text-orange-600">{systemMetrics.totalLoss}%</p>
                    <p className="text-[10px] text-muted-foreground">Temp & System</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Panel Legend */}
            <Card className="glass-card">
              <CardContent className="py-4 flex flex-wrap items-center justify-center gap-6">
                <div className="flex items-center gap-2">
                  <img src="/images/panels/good.png" className="w-8 h-8 object-contain" alt="Good" />
                  <span className="text-sm font-medium text-green-700">Healthy (Good)</span>
                </div>
                <div className="flex items-center gap-2">
                  <img src="/images/panels/moderate.png" className="w-8 h-8 object-contain" alt="Moderate" />
                  <span className="text-sm font-medium text-yellow-700">Moderate Defect</span>
                </div>
                <div className="flex items-center gap-2">
                  <img src="/images/panels/bad.png" className="w-8 h-8 object-contain" alt="Bad" />
                  <span className="text-sm font-medium text-red-700">Critical Fault (Bad)</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-slate-800">Unit Monitoring</h2>
              <div className="flex bg-slate-200/50 p-1 rounded-xl border border-slate-200">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className={viewMode === 'grid' ? 'rounded-lg shadow-sm' : 'rounded-lg'}
                >
                  Detailed Grid
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className={viewMode === 'table' ? 'rounded-lg shadow-sm' : 'rounded-lg'}
                >
                  Node Fault Status
                </Button>
              </div>
            </div>

            {/* Tables and Panels */}
            {viewMode === 'grid' ? (
              tables.length > 0 ? (
                <div className="flex-1 overflow-auto space-y-6">
                  {tables.map((table) => {
                    const tableId = table.id || table.node || table.serialNumber;
                    const tablePanels = panels.filter(p => p.tableId === tableId);

                    return (
                      <Card key={tableId} className="glass-card mb-4 overflow-hidden border-2 shadow-lg">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-3">
                          <CardTitle className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="flex-shrink-0 bg-primary text-white shadow-sm rounded-md px-3 py-1.5 font-bold text-lg leading-none">
                                {table.node || table.serialNumber || 'TBL'}
                              </div>
                              <div className="flex flex-col text-left">
                                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-tight">Solar Array</span>
                                <Badge variant="outline" className="w-fit text-[10px] h-4 leading-none bg-white border-slate-200 mt-0.5">{tablePanels.length} Panels</Badge>
                              </div>
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-2 bg-slate-50">
                          <div className="space-y-1">
                            {/* Compact Single Line Panel Row */}
                            <div className="flex gap-2 p-3 bg-white border border-slate-100 rounded-xl overflow-x-auto custom-scrollbar shadow-sm">
                              {tablePanels.map((p) => (
                                <div
                                  key={p.id}
                                  className="flex-shrink-0 flex flex-col items-center group cursor-pointer transition-transform duration-200 active:scale-95"
                                  onClick={() => handlePanelClick(p, table.id || table.node || table.serialNumber)}
                                >
                                  <div className="w-12 h-16 border border-slate-200 rounded-lg flex items-center justify-center overflow-hidden relative bg-slate-100 shadow-inner">
                                    <img
                                      src={p.status === 'fault' ? '/images/panels/bad.png' : p.status === 'average' ? '/images/panels/moderate.png' : '/images/panels/good.png'}
                                      alt={p.status}
                                      className="absolute inset-0 w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 flex justify-center backdrop-blur-[1px]">
                                      <span className="text-[7.5px] font-bold text-white leading-none tracking-tight">{p.currentVoltage.toFixed(1)}V</span>
                                    </div>
                                  </div>
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
              )
            ) : (
              <Card className="glass-card">
                <CardContent className="p-0 overflow-auto">
                  <div className="min-w-full overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 font-bold text-slate-700 sticky left-0 bg-slate-50 z-10 border-r">Time</th>
                          <th className="px-4 py-3 font-bold text-slate-700 sticky left-[80px] bg-slate-50 z-10 border-r min-w-[120px]">Node/Table</th>
                          {/* Dynamically find max p-index */}
                          {Array.from({
                            length: Math.max(...nodeFaultStatusData.map(d =>
                              Object.keys(d).filter(k => k.startsWith('p')).length
                            ), 0)
                          }).map((_, i) => (
                            <th key={i} className="px-3 py-3 font-bold text-slate-700 text-center min-w-[60px] border-r">P{i + 1}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {nodeFaultStatusData.map((row, idx) => {
                          const panelKeys = Object.keys(row).filter(k => /^p\d+$/.test(k)).sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));

                          return (
                            <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-3 text-slate-600 whitespace-nowrap sticky left-0 bg-white z-10 border-r text-[11px]">
                                {new Date(row.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="px-4 py-3 font-bold text-primary sticky left-[80px] bg-white z-10 border-r min-w-[120px]">
                                {row.node}
                              </td>
                              {panelKeys.map((pKey, sIdx) => {
                                const status = row[pKey];
                                return (
                                  <td key={sIdx} className="px-3 py-3 text-center border-r">
                                    <Badge
                                      variant="outline"
                                      className={`
                                        w-10 h-6 flex items-center justify-center text-[10px] font-bold uppercase tracking-tighter
                                        ${status === 'good' ? 'bg-green-50 text-green-700 border-green-200' :
                                          status === 'moderate' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                            'bg-red-50 text-red-700 border-red-200'}
                                      `}
                                    >
                                      {status.charAt(0)}
                                    </Badge>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {nodeFaultStatusData.length === 0 && (
                    <div className="py-12 text-center text-muted-foreground italic">
                      No status data available for the current snapshot.
                    </div>
                  )}
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
                    <input type="checkbox" checked={propagateSeries} onChange={(e) => setPropagateSeries(e.target.checked)} />
                  </div>
                  <div className="mt-3">
                    <Button size="sm" onClick={() => setShowMakeFault(true)}>Make Fault</Button>
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
                            className={`flex items-center justify-between p-2 rounded-lg border ${panel.status === 'Fault'
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
      </main >

      {/* Logout Confirmation Dialog */}
      < AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog} >
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
      </AlertDialog >

      {/* Delete Panel Dialog */}
      < AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog} >
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
      </AlertDialog >

      {/* Add Panel Dialog */}
      < Dialog open={showAddPanelDialog} onOpenChange={setShowAddPanelDialog} >
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
      </Dialog >

      {/* Make Fault Dialog (Technicians) */}
      < Dialog open={showMakeFault} onOpenChange={setShowMakeFault} >
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
                <Button variant={mfPosition === 'top' ? 'default' : 'outline'} size="sm" onClick={() => setMfPosition('top')} className="flex-1">Top</Button>
                <Button variant={mfPosition === 'bottom' ? 'default' : 'outline'} size="sm" onClick={() => setMfPosition('bottom')} className="flex-1">Bottom</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Panel</Label>
              <Select value={String(mfPanelIndex)} onValueChange={(v) => setMfPanelIndex(parseInt(v, 10))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select panel" />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    const t = tables.find(x => x.id === mfTableId);
                    const count = t ? (mfPosition === 'top' ? t.panelsTop : t.panelsBottom) : 0;
                    const items = [] as JSX.Element[];
                    for (let i = 0; i < count; i++) items.push(<SelectItem key={i} value={String(i)}>P{i + 1}</SelectItem>);
                    return items;
                  })()}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Current (A)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={mfCurrent}
                  onChange={(e) => setMfCurrent(e.target.value)}
                  placeholder={`Nominal: ${expectedCurrent}A`}
                />
              </div>
              <div className="space-y-2">
                <Label>Voltage (V)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={mfVoltage}
                  onChange={(e) => setMfVoltage(e.target.value)}
                  placeholder={`Nominal: ${expectedVoltage}V`}
                />
              </div>
            </div>
            {/* Threshold guidance and live preview */}
            <div className="rounded-md border p-3 text-xs space-y-2 bg-muted/40">
              <div className="font-semibold">Health thresholds</div>
              <div>• Good: ≥ {expectedCurrent.toFixed(1)} A (≈ 100%)</div>
              <div>• Moderate: ≥ {(expectedCurrent * 0.5).toFixed(1)} A and &lt; {expectedCurrent.toFixed(1)} A (≈ 50%–99%)</div>
              <div>• Fault: &lt; {(expectedCurrent * 0.5).toFixed(1)} A (≈ &lt;50%)</div>
              {(() => {
                const v = parseFloat(mfVoltage);
                if (!Number.isFinite(v) || expectedVoltage <= 0) return null;
                const health = Math.round((v / expectedVoltage) * 100);
                let cat: 'good' | 'average' | 'fault' = 'good';
                if (health >= 98) cat = 'good'; else if (health >= 50) cat = 'average'; else cat = 'fault';
                return (
                  <div className="flex flex-col gap-2 pt-2 border-t mt-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-medium">Preview Status:</div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-bold">{health}%</p>
                          <p className="text-[10px] text-muted-foreground">Voltage Health</p>
                        </div>
                        <img
                          src={cat === 'fault' ? '/images/panels/bad.png' : cat === 'average' ? '/images/panels/moderate.png' : '/images/panels/good.png'}
                          className="w-10 h-10 object-contain rounded border bg-white p-0.5"
                          alt={cat}
                        />
                        <Badge variant={cat === 'fault' ? 'destructive' : (cat === 'average' ? 'secondary' : 'default')} className={cat === 'average' ? 'bg-yellow-500 text-yellow-900' : ''}>
                          {cat === 'good' ? 'GOOD' : cat === 'average' ? 'MODERATE' : 'BAD'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Propagate series fault</span>
              <input type="checkbox" checked={propagateSeries} onChange={(e) => setPropagateSeries(e.target.checked)} />
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowMakeFault(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              className="flex-1 bg-yellow-600 hover:bg-yellow-700"
              onClick={async () => {
                if (!user?.companyId) return;
                if (!mfTableId) return;
                const cVal = parseFloat(mfCurrent);
                const vVal = parseFloat(mfVoltage);
                if (!Number.isFinite(cVal)) return;
                try {
                  const res = await setPanelCurrent(user.companyId, mfTableId, mfPosition, mfPanelIndex, cVal, propagateSeries, vVal);
                  if (res.success) {
                    toast({
                      title: "Success",
                      description: `Simulated ${cVal}A fault on P${mfPanelIndex + 1} (${mfPosition}).`,
                    });
                    await loadData();
                    setShowMakeFault(false);
                    setMfCurrent('');
                    setMfVoltage('');
                  } else {
                    toast({
                      variant: "destructive",
                      title: "Error",
                      description: res.message || "Failed to update panel current.",
                    });
                  }
                } catch (e) {
                  console.error('Failed to make fault', e);
                  toast({
                    variant: "destructive",
                    title: "Network Error",
                    description: "Could not connect to the server.",
                  });
                }
              }}
            >Apply</Button>
          </div>
        </DialogContent>
      </Dialog >


    </div >
  );
};

export default UnifiedViewTables;
