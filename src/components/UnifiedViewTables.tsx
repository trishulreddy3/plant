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
import { getAllCompanies, getPlantDetails, deletePanel, refreshPanelData, addPanels, setPanelCurrent, getNodeFaultStatus, getFlatLiveData } from '@/lib/realFileSystem';


interface UnifiedViewTablesProps {
  userRole: 'super_admin' | 'plant_admin' | 'user';
  companyId?: string; // For super admin viewing specific company
  showBackButton?: boolean;
  backButtonText?: string;
  onBackClick?: () => void;
  hideHeader?: boolean;
  refreshTrigger?: any;
}

const UnifiedViewTables: React.FC<UnifiedViewTablesProps> = ({
  userRole,
  companyId,
  showBackButton = false,
  backButtonText = 'Back',
  onBackClick,
  hideHeader = false,
  refreshTrigger
}) => {
  const [nodeFaultStatusData, setNodeFaultStatusData] = useState<any[]>([]);
  const [flatLiveData, setFlatLiveData] = useState<any[]>([]);
  const [user, setUser] = useState(getCurrentUser());
  const isTechnician = (user?.role === 'technician');
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'faults'>('grid');
  const LAZY_MODE = false;
  const navigate = useNavigate();
  const { toast } = useToast();
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
    position: string;
    panelCount: number;
  }>({ tableId: '', position: 'Main', panelCount: 1 });

  const [propagateSeries, setPropagateSeries] = useState<boolean>(false);
  const [showMakeFault, setShowMakeFault] = useState(false);
  const [mfTableId, setMfTableId] = useState<string>('');
  const [mfPosition, setMfPosition] = useState<string>('Main');
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
    const targetCompanyId = companyId || currentUser.companyId;

    // --- NEW: Dynamic Nominals for Make Fault Dialog ---
    const selectedTable = tables.find(t => t.id === mfTableId);
    if (selectedTable) {
      setExpectedVoltage(selectedTable.voltagePerPanel || 0);
      setExpectedCurrent(selectedTable.currentPerPanel || 0);
    }

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
    }, 2000); // 2 seconds for highly responsive dashboard

    return () => clearInterval(interval);
  }, [user, companyId, dataLoaded, refreshTrigger]);

  const [lastRefreshed, setLastRefreshed] = useState<string>(new Date().toLocaleTimeString());

  useEffect(() => {
    if (panels.length > 0) {
      setLastRefreshed(new Date().toLocaleTimeString());
    }
  }, [panels]);

  // Auto-select first table for Make Fault defaults if none selected (Fixed: Moved out of data polling interval)
  useEffect(() => {
    setMfTableId(prev => {
      if (!prev && tables.length > 0) return tables[0].id;
      return prev;
    });
  }, [tables]);

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
    // Determine the target company ID:
    // 1. If passed explicitly as a prop (Super Admin viewing a company), use that.
    // 2. If no prop, fallback to the logged-in user's companyId.
    const targetId = companyId || user?.companyId;

    console.log('[UnifiedViewTables] loadData start. targetId:', targetId, 'prop companyId:', companyId, 'user companyId:', user?.companyId);

    if (!targetId) {
      console.warn('[UnifiedViewTables] No target company ID found.');
      return;
    }

    try {
      const backendCompanies = await getAllCompanies();
      console.log('[UnifiedViewTables] Found companies:', backendCompanies.length);

      // Resolve by id or fallback to name match if id mismatch
      let selectedCompany = backendCompanies.find(c => c.id === targetId);
      if (!selectedCompany && targetId) {
        // Fallback 1: Check if targetId is actually a name
        selectedCompany = backendCompanies.find(c => c.name?.toLowerCase() === targetId.toLowerCase());
      }
      if (!selectedCompany && user?.companyName) {
        // Fallback 2: Check logged-in user's company name
        selectedCompany = backendCompanies.find(c => c.name?.toLowerCase() === user.companyName?.toLowerCase());
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
          })).sort((a: any, b: any) => {
            const nodeA = String(a.node || a.serialNumber || '');
            const nodeB = String(b.node || b.serialNumber || '');
            return nodeA.localeCompare(nodeB, undefined, { numeric: true, sensitivity: 'base' });
          });
          setTables(tableList);

          setTables(tableList);

          // Fetch Node Fault Status for the table view
          try {
            const faultRes = await getNodeFaultStatus(selectedCompany.id);
            if (faultRes) {
              setNodeFaultStatusData(faultRes);
            }
          } catch (err) {
            console.error('Failed to load node fault status', err);
          }

          // Fetch Flat Live Data for the exact table view
          try {
            const liveRes = await getFlatLiveData(selectedCompany.id);
            if (liveRes) {
              setFlatLiveData(liveRes);
            }
          } catch (err) {
            console.error('Failed to load flat live data', err);
          }

          // Generate panels from plant details (Database-Driven State)
          const generatedPanels: Panel[] = [];

          (plantDetails.live_data || []).forEach((table: any) => {
            const vs = table.panelVoltages || [];
            const cs = table.panelCurrents || [];
            const ss = table.panelStatuses || [];

            vs.forEach((vol: number, i: number) => {
              generatedPanels.push({
                id: `${table.serialNumber || table.node}-P${i + 1}`,
                tableId: table.id || table.node || table.serialNumber,
                companyId: user.companyId,
                name: `P${i + 1}`,
                position: 'Main',
                maxVoltage: table.voltagePerPanel || plantDetails.voltagePerPanel || 40,
                maxCurrent: table.currentPerPanel || plantDetails.currentPerPanel || 10,
                currentVoltage: vol,
                currentCurrent: table.current !== undefined ? table.current : (cs[i] || 0),
                powerGenerated: vol * (table.current !== undefined ? table.current : (cs[i] || 0)),
                status: ss[i] || 'good',
                lastUpdated: table.time || new Date().toISOString()
              });
            });
          });

          setPanels(generatedPanels);
          console.log('[UnifiedViewTables] Generated panels:', generatedPanels.length,
            'Bad:', generatedPanels.filter(p => p.status === 'bad').length,
            'Moderate:', generatedPanels.filter(p => p.status === 'moderate').length
          );
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

  const confirmLogout = async () => {
    await logout();
    navigate('/');
  };

  const cancelLogout = () => {
    setShowLogoutDialog(false);
  };

  const handleAddPanel = (tableId: string) => {
    setAddPanelData({ tableId, position: 'Main', panelCount: 1 });
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
          description: `${addPanelData.panelCount} panel(s) added successfully.`,
          variant: "default",
        });

        // Reload data to reflect changes
        loadData();

        // Close dialog
        setShowAddPanelDialog(false);
        setAddPanelData({ tableId: '', position: 'Main', panelCount: 1 });
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
    setAddPanelData({ tableId: '', position: 'Main', panelCount: 1 });
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
      return;
    }

    // For Technicians: Update Make Fault defaults and open dialog
    if (isTechnician) {
      setMfTableId(tableId);
      // Extracts index from p.id or p.name (e.g., "P1" -> 0)
      const index = parseInt(panel.name.replace('P', ''), 10) - 1;
      if (!isNaN(index)) {
        setMfPanelIndex(index);
      }

      // Pre-fill with existing values
      setMfCurrent(panel.currentCurrent.toString());
      setMfVoltage(panel.currentVoltage.toString());

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

            vs.forEach((vol: number, i: number) => {
              const voltageHealth = (vol / vpp) * 100;
              let status: 'good' | 'moderate' | 'bad' = 'good';
              if (voltageHealth < 50) status = 'bad';
              else if (voltageHealth < 98) status = 'moderate';

              generatedPanels.push({
                id: `${table.serialNumber || table.node}-P${i + 1}`,
                tableId: table.id,
                companyId: user.companyId,
                name: `P${i + 1}`,
                position: 'Main',
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

  // Function to get panel image based on status (good/moderate/bad)
  const getPanelImage = (panel: Panel): string => {
    switch (panel.status) {
      case 'good':
        return '/images/panels/good.png';
      case 'moderate':
        return '/images/panels/moderate.png';
      case 'bad':
      default:
        return '/images/panels/bad.png';
    }
  };

  const faultPanels = panels.filter(p => p.status === 'bad');
  const repairingPanels = panels.filter(p => p.status === 'moderate');
  const culpritPanels = faultPanels;

  // Series summary
  const seriesSummary = { culprits: 0, affected: 0 };

  const formatPanelList = (names: string[]) => {
    const nums = names.map(n => parseInt(n.replace(/\D/g, ''), 10)).filter(n => !isNaN(n)).sort((a, b) => a - b);
    if (nums.length === 0) return names.join(', '); // Fallback

    const ranges: string[] = [];
    let start = nums[0];
    let prev = nums[0];

    const flush = () => {
      ranges.push(start === prev ? `P${start}` : `P${start}-P${prev}`);
    };

    for (let i = 1; i < nums.length; i++) {
      if (nums[i] === prev + 1) {
        prev = nums[i];
      } else {
        flush();
        start = nums[i];
        prev = nums[i];
      }
    }
    flush();
    return ranges.join(', ');
  };

  const priorityToFix = (() => {
    if (faultPanels.length > 0) {
      // Find table with most bad panels
      const tableData: Record<string, string[]> = {};
      faultPanels.forEach(p => {
        if (!tableData[p.tableId]) tableData[p.tableId] = [];
        tableData[p.tableId].push(p.name);
      });
      // Sort by count descending
      const topEntry = Object.entries(tableData).sort((a, b) => b[1].length - a[1].length)[0];
      let tableId = topEntry[0];
      if (/node/i.test(tableId)) tableId = tableId.replace(/node/i, 'Table');

      const panelList = formatPanelList(topEntry[1]);
      return { label: `CRITICAL: Fix ${tableId} (${panelList}) immediately` };
    }
    if (repairingPanels.length > 0) {
      const tableData: Record<string, string[]> = {};
      repairingPanels.forEach(p => {
        if (!tableData[p.tableId]) tableData[p.tableId] = [];
        tableData[p.tableId].push(p.name);
      });
      const topEntry = Object.entries(tableData).sort((a, b) => b[1].length - a[1].length)[0];
      let tableId = topEntry[0];
      if (/node/i.test(tableId)) tableId = tableId.replace(/node/i, 'Table');

      const panelList = formatPanelList(topEntry[1]);
      return { label: `MAINTENANCE: Check ${tableId} (${panelList})` };
    }
    return null;
  })();

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
    <div className="h-full flex flex-col bg-gradient-to-br from-primary/5 via-background to-secondary/5 overflow-hidden">
      {/* Header - conditionally hidden */}
      {!hideHeader && (
        <header className="glass-header sticky top-0 z-10 w-full">
          <div className="container mx-auto px-4 py-3 sm:py-4">
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 sm:gap-6">
              <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                {showBackButton && (
                  <Button
                    variant="ghost"
                    onClick={onBackClick}
                    className="shrink-0 p-2 sm:px-4 sm:py-2"
                  >
                    <ArrowLeft className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">{backButtonText}</span>
                  </Button>
                )}
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-2xl font-bold text-primary truncate">
                    Solar Monitoring - {user.companyName || 'Plant'}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5 sm:mt-1">
                    <p className="text-[10px] sm:text-sm text-muted-foreground whitespace-nowrap">
                      {userRole === 'super_admin' ? 'Super Admin' :
                        userRole === 'plant_admin' ? 'Plant Admin' :
                          'User Dashboard'}
                    </p>
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-50 border border-green-100">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[8px] sm:text-[10px] font-medium text-green-700 uppercase tracking-tighter sm:tracking-wider">Live: {lastRefreshed}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center">
                {LAZY_MODE && (
                  <Button size="sm" variant="secondary" onClick={() => setDataLoaded(true)} className="h-8 sm:h-10 text-xs sm:text-sm">
                    {dataLoaded ? 'Refresh' : 'Load'}
                  </Button>
                )}
                <Button onClick={handleLogout} variant="destructive" className="h-8 sm:h-10 text-xs sm:text-sm px-2 sm:px-4">
                  <LogOut className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </div>
            </div>
          </div>
        </header>
      )}

      <main className="container mx-auto px-2 sm:px-4 py-2 flex-1 min-h-0 overflow-y-auto md:overflow-hidden">
        <div className="flex flex-col md:flex-row gap-4 sm:gap-6 h-auto md:h-full min-h-0">
          {/* Left Column: Panels (Independently Scrollable on Desktop) - Bottom on Mobile */}
          <div className="flex-1 md:overflow-y-auto pr-0 md:pr-2 custom-scrollbar min-h-0 order-2 md:order-1">
            <div className="flex flex-col gap-6 pb-20">


              <div className={`flex items-center justify-between ${isTechnician ? 'mb-1' : 'mb-2'}`}>
                <h2 className="text-xl font-bold text-slate-800">Unit Monitoring</h2>
                {isTechnician && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 border-yellow-500/50 text-yellow-700 hover:bg-yellow-50 font-semibold"
                    onClick={() => setShowMakeFault(true)}
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Make Fault
                  </Button>
                )}
              </div>

              {/* Tables and Panels - Compact Grid */}
              {tables.length > 0 ? (
                <div className="lg:flex-1 lg:overflow-auto space-y-1 pr-1 custom-scrollbar">
                  {tables.map((table) => {
                    const tableId = table.id || table.node || table.serialNumber;
                    const tablePanels = panels.filter(p => p.tableId === tableId);

                    return (
                      <div key={tableId} className="flex items-center gap-2 px-2 py-0.5 bg-white/50 border border-white/40 rounded-md shadow-sm hover:shadow-md transition-all duration-200">
                        {/* Node ID Section - Balanced Compact */}
                        <div className="flex-shrink-0 w-20">
                          <div className="bg-slate-100 text-slate-800 border border-slate-200 shadow-xs rounded px-1.5 py-0.5 font-bold text-xs text-center tracking-tight truncate">
                            {table.node || table.serialNumber || 'TBL'}
                          </div>
                        </div>

                        {/* Panels Row - Ultra Compact Wrapping */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap gap-0.5">
                            {tablePanels.map((p) => (
                              <div
                                key={p.id}
                                className="flex flex-col items-center group cursor-pointer transition-transform duration-200 active:scale-95 hover:-translate-y-0.5"
                                onClick={() => handlePanelClick(p, table.id || table.node || table.serialNumber)}
                                title={`Panel ${p.name}: ${p.currentVoltage}V`}
                              >
                                <div className="w-8 h-10 border border-slate-200 rounded-sm flex items-center justify-center overflow-hidden relative bg-slate-100 shadow-xs">
                                  <img
                                    src={p.status === 'bad' ? '/images/panels/bad.png' : p.status === 'moderate' ? '/images/panels/moderate.png' : '/images/panels/good.png'}
                                    alt={p.status}
                                    className="absolute inset-0 w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-x-0 bottom-0 bg-black/60 py-[0.1px] flex justify-center backdrop-blur-[0.5px]">
                                    <span className="text-[5px] font-bold text-white leading-none tracking-tighter">{Math.round(p.currentVoltage)}V</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {tablePanels.length === 0 && (
                              <div className="text-[8px] text-muted-foreground italic py-0.5 pl-0.5">No panels.</div>
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
          </div>

          {/* Right Column: Sidebar (Fixed / No Scroll on Desktop) - Top on Mobile */}
          <div className={`w-full md:w-[320px] shrink-0 md:h-full flex flex-col gap-3 pb-4 md:pb-0 order-1 md:order-2`}>
            {isTechnician && (
              <Card className="glass-card shadow-sm border-slate-100 bg-slate-50/50">
                <CardContent className="p-2 space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase cursor-pointer" htmlFor="propagate-cb">Propagate series fault</Label>
                    <input id="propagate-cb" type="checkbox" className="h-3.5 w-3.5 rounded border-slate-300 pointer-events-auto" checked={propagateSeries} onChange={(e) => setPropagateSeries(e.target.checked)} />
                  </div>
                  <Button size="xs" className="w-full h-8 text-[11px] font-bold shadow-sm" onClick={() => setShowMakeFault(true)}>
                    <AlertTriangle className="w-3 h-3 mr-1.5" />
                    Make Fault
                  </Button>
                </CardContent>
              </Card>
            )}



            {/* Bad Panels Only - technicians only */}
            {isTechnician && (
              <Card className="glass-card shadow-sm border-slate-100">
                <CardHeader className="p-2 pb-1.5 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                    <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                    Bad Panels
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2 pt-0">
                  {(() => {
                    // Group bad panels by table
                    const badPanels = panels.filter(p => p.status === 'bad');
                    const grouped: Record<string, number[]> = {};

                    badPanels.forEach(p => {
                      // Resolve display name: Find table by ID (p.tableId)
                      const table = tables.find(t => t.id === p.tableId);
                      let tName = table ? (table.node || table.serialNumber || 'TBL') : p.tableId;

                      // Rename Node -> Table
                      if (/node/i.test(tName)) {
                        tName = tName.replace(/node/i, 'Table');
                      }

                      if (!grouped[tName]) grouped[tName] = [];
                      const match = p.name.match(/P?(\d+)/);
                      if (match) {
                        grouped[tName].push(parseInt(match[1], 10));
                      }
                    });

                    // Generate display items
                    const startItems: string[] = [];

                    Object.keys(grouped).sort().forEach(tName => {
                      const pNums = grouped[tName].sort((a, b) => a - b);
                      if (pNums.length === 0) return;

                      let start = pNums[0];
                      let prev = pNums[0];

                      const flush = (s: number, e: number) => {
                        if (s === e) {
                          startItems.push(`${tName}.P${s}`);
                        } else {
                          startItems.push(`${tName}.P${s}-p${e}`);
                        }
                      };

                      for (let i = 1; i < pNums.length; i++) {
                        if (pNums[i] === prev + 1) {
                          prev = pNums[i];
                        } else {
                          flush(start, prev);
                          start = pNums[i];
                          prev = pNums[i];
                        }
                      }
                      flush(start, prev);
                    });

                    return startItems.length > 0 ? (
                      <div className="space-y-1 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                        {startItems.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-1.5 rounded border bg-red-50/50 border-red-100">
                            <span className="text-[11px] font-bold text-slate-700">{item}</span>
                            <Badge variant="destructive" className="text-[9px] h-3.5 px-1">Fault</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[9px] text-muted-foreground text-center py-2 italic">
                        No critical faults detected
                      </p>
                    );
                  })()}
                </CardContent>
              </Card>
            )}

            {isTechnician && (
              <Card className="glass-card shadow-sm border-slate-100">
                <CardHeader className="p-2 pb-1 bg-slate-50/30">
                  <CardTitle className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                    <Activity className="h-3.5 w-3.5 text-primary" />
                    Priority / Losses
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2 pt-1.5">
                  {priorityToFix ? (
                    <p className="text-[10px] font-extrabold text-orange-600 leading-tight">
                      {priorityToFix.label}
                    </p>
                  ) : (
                    <p className="text-[9px] text-muted-foreground italic py-0.5">No losses detected</p>
                  )}
                </CardContent>
              </Card>
            )}


            {isTechnician && (
              <Card className="glass-card shadow-sm border-slate-100 bg-slate-50/50">
                <CardHeader className="p-2 pb-1 border-b border-slate-100/50">
                  <CardTitle className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Status Legend</CardTitle>
                </CardHeader>
                <CardContent className="p-2 pt-1.5 space-y-1">
                  <div className="flex items-center gap-2">
                    <img src="/images/panels/good.png" className="w-3.5 h-3.5 object-contain" alt="Good" />
                    <span className="text-[10px] font-medium text-green-700">Healthy</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <img src="/images/panels/moderate.png" className="w-3.5 h-3.5 object-contain" alt="Moderate" />
                    <span className="text-[10px] font-medium text-yellow-700">Moderate</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <img src="/images/panels/bad.png" className="w-3.5 h-3.5 object-contain" alt="Bad" />
                    <span className="text-[10px] font-medium text-red-700">Critical</span>
                  </div>
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
              Provide the number of panels to add to this table.
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

            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> Adding {addPanelData.panelCount} panel(s) will increase the total panel count for this table.
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
              Select the target table and panel, then enter a current to simulate a fault.
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
                    <SelectItem key={t.id} value={t.id}>{t.node || t.serialNumber}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Removed Row Selection */}

            <div className="space-y-2">
              <Label>Panel</Label>
              <Select value={String(mfPanelIndex)} onValueChange={(v) => setMfPanelIndex(parseInt(v, 10))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select panel" />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    const t = tables.find(x => x.id === mfTableId);
                    const count = t ? (t.panelVoltages?.length || t.panelsTop + t.panelsBottom || 20) : 0;
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
                  placeholder={`Nominal: ${expectedCurrent.toFixed(1)}A`}
                />
              </div>
              <div className="space-y-2">
                <Label>Voltage (V)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={mfVoltage}
                  onChange={(e) => setMfVoltage(e.target.value)}
                  placeholder={`Nominal: ${expectedVoltage.toFixed(1)}V`}
                />
              </div>
            </div>
            {/* Threshold guidance and live preview */}
            <div className="rounded-md border p-3 text-xs space-y-2 bg-muted/40">
              <div className="font-semibold">Health thresholds</div>
              <div>• Good: ≥ {(expectedVoltage * 0.98).toFixed(1)} V (≈ 98%–100%)</div>
              <div>• Moderate: ≥ {(expectedVoltage * 0.5).toFixed(1)} V and &lt; {(expectedVoltage * 0.98).toFixed(1)} V (≈ 50%–97%)</div>
              <div>• Fault: &lt; {(expectedVoltage * 0.5).toFixed(1)} V (≈ &lt; 50%)</div>
              {(() => {
                const v = parseFloat(mfVoltage);
                if (!Number.isFinite(v) || expectedVoltage <= 0) return null;
                const health = Math.round((v / expectedVoltage) * 100);
                let cat: 'good' | 'moderate' | 'bad' = 'good';
                if (health >= 98) cat = 'good'; else if (health >= 50) cat = 'moderate'; else cat = 'bad';
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
                          src={cat === 'bad' ? '/images/panels/bad.png' : cat === 'moderate' ? '/images/panels/moderate.png' : '/images/panels/good.png'}
                          className="w-10 h-10 object-contain rounded border bg-white p-0.5"
                          alt={cat}
                        />
                        <Badge variant={cat === 'bad' ? 'destructive' : (cat === 'moderate' ? 'secondary' : 'default')} className={cat === 'moderate' ? 'bg-yellow-500 text-yellow-900' : ''}>
                          {cat === 'good' ? 'GOOD' : cat === 'moderate' ? 'MODERATE' : 'BAD'}
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
                if (!user?.companyId) {
                  toast({
                    variant: "destructive",
                    title: "Error",
                    description: "User company ID not found.",
                  });
                  return;
                }
                if (!mfTableId) {
                  toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Table ID not selected.",
                  });
                  return;
                }
                const cVal = parseFloat(mfCurrent);
                const vVal = parseFloat(mfVoltage);
                if (!Number.isFinite(cVal)) {
                  toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Invalid current value.",
                  });
                  return;
                }
                if (typeof mfPanelIndex !== 'number' || mfPanelIndex < 0) {
                  toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Invalid panel index.",
                  });
                  return;
                }
                console.log('[MakeFault] Sending request:', {
                  companyId: user?.companyId || 'MISSING',
                  tableId: mfTableId,
                  position: 'Main',
                  index: mfPanelIndex,
                  current: cVal,
                  voltage: vVal,
                  propagateSeries
                });
                try {
                  const res = await setPanelCurrent(
                    user.companyId,
                    mfTableId,
                    'Main',
                    mfPanelIndex,
                    cVal,
                    propagateSeries,
                    vVal,
                    user.email,
                    user.role
                  );
                  if (res.success) {
                    toast({
                      title: "Success",
                      description: `Simulated ${cVal}A fault on P${mfPanelIndex + 1}.`,
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
                    description: e instanceof Error ? e.message : "Could not connect to the server.",
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
