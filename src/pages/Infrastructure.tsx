import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Zap, Plus, Eye, Building2, Shield, Mail, Activity, Edit, Trash2, X, Save } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { getTablesByCompany } from '@/lib/data';
import { getCompanies } from '@/lib/auth';
import { PlantDetails, getPlantDetails, deleteTableFromPlant } from '@/lib/realFileSystem';
import { useToast } from '@/hooks/use-toast';
import GradientHeading from '@/components/ui/GradientHeading';


const Infrastructure = () => {
  const navigate = useNavigate();
  const [user] = useState(getCurrentUser());
  const location = useLocation();
  const isEmbedded = location.pathname.startsWith('/plant-admin-dashboard');
  const [company, setCompany] = useState<any>(null);
  const [tables, setTables] = useState<any[]>([]);
  const [plantDetails, setPlantDetails] = useState<PlantDetails | null>(null);
  const [powerUnit, setPowerUnit] = useState<'W' | 'kW' | 'MW'>('W');
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<any | null>(null);
  const [showDeleteStep1, setShowDeleteStep1] = useState(false);
  const [showDeleteStep2, setShowDeleteStep2] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const { toast } = useToast();

  // Function to convert power based on selected unit
  const convertPower = (powerInWatts: number): string => {
    switch (powerUnit) {
      case 'W':
        return `${powerInWatts}W`;
      case 'kW':
        return `${(powerInWatts / 1000).toFixed(1)}kW`;
      case 'MW':
        return `${(powerInWatts / 1000000).toFixed(3)}MW`;
      default:
        return `${powerInWatts}W`;
    }
  };

  useEffect(() => {
    if (!user || user.role !== 'plant_admin') {
      navigate('/login');
      return;
    }

    const loadData = async () => {
      if (!user?.companyId) return;

      try {
        // Try to load from backend first
        const { getAllCompanies } = await import('@/lib/realFileSystem');
        const backendCompanies = await getAllCompanies();
        const selectedCompany = backendCompanies.find(c => c.id === user.companyId);

        if (selectedCompany) {
          setCompany(selectedCompany);

          // Load plant details to get tables
          const { getPlantDetails } = await import('@/lib/realFileSystem');
          const plantDetails = await getPlantDetails(user.companyId);
          if (plantDetails) {
            setPlantDetails(plantDetails); // Store plant details for table calculations
            setTables(plantDetails.tables || []);
          } else {
            setTables([]);
          }
        } else {
          // Fallback to localStorage
          const companies = getCompanies();
          const userCompany = companies.find(c => c.id === user.companyId);
          setCompany(userCompany);

          const companyTables = getTablesByCompany(user.companyId);
          setTables(companyTables);
        }
      } catch (error) {
        console.error('Error loading company data:', error);
        // Fallback to localStorage
        const companies = getCompanies();
        const userCompany = companies.find(c => c.id === user.companyId);
        setCompany(userCompany);

        const companyTables = getTablesByCompany(user.companyId);
        setTables(companyTables);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, navigate]);

  const reloadTables = async () => {
    if (!user?.companyId) return;
    try {
      const details = await getPlantDetails(user.companyId);
      if (details) {
        setPlantDetails(details);
        setTables(details.tables || []);

        // Also update company object if power limits changed
        setCompany(prev => ({
          ...prev,
          voltagePerPanel: details.voltagePerPanel,
          currentPerPanel: details.currentPerPanel,
          plantPowerKW: details.plantPowerKW
        }));
      }
    } catch (e) {
      console.error('Failed to reload tables', e);
    }
  };

  useEffect(() => {
    if (!user?.companyId) return;

    // Initial load happens in the other useEffect, but let's set up the interval
    const interval = setInterval(reloadTables, 5000); // 5 seconds
    return () => clearInterval(interval);
  }, [user?.companyId]);

  const onRowClick = (table: any) => {
    setSelectedTable(prev => (prev?.id === table.id ? null : table));
  };

  const goToEditPage = async () => {
    if (!selectedTable || !user?.companyId) return;
    try {
      const latest = await getPlantDetails(user.companyId);
      const resolved = latest?.tables?.find((t: any) => t.serialNumber === selectedTable.serialNumber) || selectedTable;
      navigate('/edit-table', { state: { table: resolved } });
    } catch {
      navigate('/edit-table', { state: { table: selectedTable } });
    }
  };

  const openDelete = () => {
    if (!selectedTable) return;
    setDeleteConfirm('');
    setShowDeleteStep1(true);
  };

  const confirmDelete = async () => {
    if (!user?.companyId || !selectedTable) return;
    if (deleteConfirm !== selectedTable.serialNumber) {
      toast({ title: 'Confirmation mismatch', description: 'Type the exact Table No to confirm', variant: 'destructive' });
      return;
    }
    try {
      // Resolve table ID from backend to avoid stale IDs
      const latest = await getPlantDetails(user.companyId);
      const resolved = latest?.tables?.find((t: any) => t.serialNumber === selectedTable.serialNumber) || selectedTable;
      await deleteTableFromPlant(user.companyId, resolved.id);
      toast({ title: 'Deleted', description: `${selectedTable.serialNumber} deleted` });
      setShowDeleteStep2(false);
      setShowDeleteStep1(false);
      setSelectedTable(null);
      await reloadTables();
    } catch (error) {
      console.error('Error deleting table:', error);
      toast({ title: 'Error', description: 'Failed to delete table', variant: 'destructive' });
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        {!isEmbedded && (
          <header className="glass-header sticky top-0 z-10">
            <div className="container mx-auto px-4 py-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/plant-admin-dashboard')}
                className="mb-2"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
              <GradientHeading size="md">Infrastructure Management</GradientHeading>
            </div>
          </header>
        )}
        <main className="container mx-auto px-4 py-8">
          <Card className="card-modern">
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
              <p className="text-lg font-semibold mb-2">Loading Infrastructure Data...</p>
              <p className="text-sm text-muted-foreground">
                Please wait while we fetch the company information.
              </p>
            </CardContent>
          </Card>
        </main>

        {/* Delete Step 1: Caution */}
        {showDeleteStep1 && selectedTable && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="glass-card max-w-md w-full mx-4">
              <CardHeader>
                <CardTitle className="text-red-600">Caution: Deleting Table</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">You are about to permanently delete <span className="font-mono font-semibold">{selectedTable.serialNumber}</span>. This action cannot be undone.</p>
                <div className="flex gap-3 pt-2">
                  <Button className="flex-1" onClick={() => { setShowDeleteStep1(false); setShowDeleteStep2(true); }}>I Understand, Continue</Button>
                  <Button variant="outline" className="flex-1" onClick={() => setShowDeleteStep1(false)}>
                    <X className="mr-2 h-4 w-4" /> Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Delete Step 2: Type to confirm */}
        {showDeleteStep2 && selectedTable && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="glass-card max-w-md w-full mx-4">
              <CardHeader>
                <CardTitle className="text-red-700">Confirm Deletion</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">Type the Table No to confirm deletion (e.g., <span className="font-mono font-semibold">{selectedTable.serialNumber}</span> or its number only)</p>
                <Input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder={`${selectedTable.serialNumber} or ${String(selectedTable.serialNumber || '').replace(/\D+/g, '')}`} className="h-12" />
                <div className="flex gap-3 pt-2">
                  <Button variant="destructive" className="flex-1 h-12" onClick={confirmDelete} disabled={!((deleteConfirm === selectedTable.serialNumber) || (deleteConfirm && deleteConfirm.replace(/\D+/g, '') === String(selectedTable.serialNumber || '').replace(/\D+/g, '')))}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </Button>
                  <Button variant="outline" className="flex-1 h-12" onClick={() => setShowDeleteStep2(false)}>
                    <X className="mr-2 h-4 w-4" /> Back
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}


      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <header className="glass-header sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/plant-admin-dashboard')}
              className="mb-2"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            <h1 className="text-2xl font-bold text-primary">Infrastructure Management</h1>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <Card className="card-modern">
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-semibold mb-2">Company Not Found</p>
              <p className="text-sm text-muted-foreground mb-4">
                Unable to load company information. Please try logging in again.
              </p>
              <Button onClick={() => navigate('/login')}>
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="w-full">
      {!isEmbedded && (
        <header className="glass-header sticky top-0 z-10 mb-6">
          <div className="container mx-auto px-4 py-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/plant-admin-dashboard')}
              className="mb-2"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            <h1 className="text-2xl font-bold text-primary">Infrastructure Management</h1>
          </div>
        </header>
      )}

      <main className="w-full space-y-6">
        {/* Plant Details */}
        <Card className="card-modern shadow-md border border-gray-200/50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Zap className="h-5 w-5 text-primary" />
              Plant Details
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-2">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Plant Power</p>
              <p className="text-2xl font-bold text-primary">{company.plantPowerKW} kW</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Panel Voltage</p>
              <p className="text-2xl font-bold text-secondary">{company.voltagePerPanel} V</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Panel Current</p>
              <p className="text-2xl font-bold text-secondary">{company.currentPerPanel} A</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Tables</p>
              <p className="text-2xl font-bold">{tables.length}</p>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            variant="outline"
            onClick={() => navigate('/add-table')}
            className="w-full h-16 text-base font-medium rounded-xl px-6 border-2 border-primary text-primary hover:bg-primary/10 hover:border-primary/80 focus-visible:ring-2 focus-visible:ring-primary/40 transition-all duration-200"
          >
            <Plus className="mr-2 h-5 w-5" />
            Add New Table
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate('/plant-monitor')}
            className="w-full h-16 text-base font-medium rounded-xl px-6 border-2 border-primary text-primary hover:bg-primary/10 hover:border-primary/80 focus-visible:ring-2 focus-visible:ring-primary/40 transition-all duration-200"
          >
            <Eye className="mr-2 h-5 w-5" />
            View Tables & Panels
          </Button>
        </div>

        {/* Actions for selected table */}
        {selectedTable && (
          <Card className="card-modern shadow-md border border-gray-200/50">
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-3 items-center justify-between">
                <div className="font-semibold text-primary text-lg">
                  Selected: <span className="font-mono">{selectedTable.serialNumber}</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={goToEditPage} className="gradient-primary shadow-sm">
                    <Edit className="mr-2 h-4 w-4" /> Edit
                  </Button>
                  <Button onClick={openDelete} variant="destructive" className="shadow-sm">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedTable(null)} className="shadow-sm">
                    <X className="mr-2 h-4 w-4" /> Deselect
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Tables Overview */}
        {tables.length > 0 && (
          <Card className="card-modern shadow-md border border-gray-200/50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Activity className="h-5 w-5 text-primary" />
                All Tables Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                      <th className="text-left py-4 px-4 font-semibold text-gray-800 border-r border-gray-200">Table No</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-800 border-r border-gray-200">Panel Count</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-800 border-r border-gray-200">Voltage per Panel</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-800 border-r border-gray-200">Current per Panel</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-800 border-r border-gray-200">
                        <div className="flex items-center gap-2">
                          Max Power Generating
                          <Select value={powerUnit} onValueChange={(value: 'W' | 'kW' | 'MW') => setPowerUnit(value)}>
                            <SelectTrigger className="w-20 h-8 border-gray-300">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="W">W</SelectItem>
                              <SelectItem value="kW">kW</SelectItem>
                              <SelectItem value="MW">MW</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-800">Total Panels</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tables.map((table) => {
                      const totalPanels = table.panelCount || table.panelVoltages?.length || ((table.panelsTop || 0) + (table.panelsBottom || 0)) || 0;

                      // Get voltage and current from plant details
                      const voltagePerPanel = plantDetails?.voltagePerPanel || company?.voltagePerPanel || 20;
                      const currentPerPanel = plantDetails?.currentPerPanel || company?.currentPerPanel || 10;
                      const maxPowerPerPanel = voltagePerPanel * currentPerPanel;
                      const maxTotalPower = maxPowerPerPanel * totalPanels;
                      const displaySerial = table.node || table.serialNumber;

                      return (
                        <tr
                          key={table.id}
                          onClick={() => onRowClick(table)}
                          className={`border-b border-gray-200 cursor-pointer transition-colors duration-150 ${selectedTable?.id === table.id
                            ? 'bg-blue-50 hover:bg-blue-100'
                            : 'hover:bg-gray-50'
                            }`}
                        >
                          <td className="py-4 px-4 font-medium text-primary border-r border-gray-200">
                            <span className="font-mono font-semibold">{displaySerial}</span>
                          </td>
                          <td className="py-4 px-4 border-r border-gray-200">{totalPanels}</td>
                          <td className="py-4 px-4 border-r border-gray-200">{voltagePerPanel}V</td>
                          <td className="py-4 px-4 border-r border-gray-200">{currentPerPanel}A</td>
                          <td className="py-4 px-4 font-semibold text-green-600 border-r border-gray-200">{convertPower(maxTotalPower)}</td>
                          <td className="py-4 px-4 font-medium">{totalPanels}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {tables.length === 0 && (
          <Card className="card-modern shadow-md border border-gray-200/50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Activity className="h-5 w-5 text-primary" />
                All Tables Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <Activity className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-semibold mb-2">No tables found</p>
                <p className="text-sm text-gray-400">Create your first table to get started</p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Delete Step 1: Caution (visible when not loading) */}
      {showDeleteStep1 && selectedTable && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="glass-card max-w-md w-full mx-4">
            <CardHeader>
              <CardTitle className="text-red-600">Caution: Deleting Table</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">You are about to permanently delete <span className="font-mono font-semibold">{selectedTable.serialNumber}</span>. This action cannot be undone.</p>
              <div className="flex gap-3 pt-2">
                <Button className="flex-1" onClick={() => { setShowDeleteStep1(false); setShowDeleteStep2(true); }}>I Understand, Continue</Button>
                <Button variant="outline" className="flex-1" onClick={() => setShowDeleteStep1(false)}>
                  <X className="mr-2 h-4 w-4" /> Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Step 2: Type to confirm (visible when not loading) */}
      {showDeleteStep2 && selectedTable && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="glass-card max-w-md w-full mx-4">
            <CardHeader>
              <CardTitle className="text-red-700">Confirm Deletion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">Type the Table No to confirm deletion: <span className="font-mono font-semibold">{selectedTable.serialNumber}</span></p>
              <Input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder={selectedTable.serialNumber} className="h-12" />
              <div className="flex gap-3 pt-2">
                <Button variant="destructive" className="flex-1 h-12" onClick={confirmDelete} disabled={deleteConfirm !== selectedTable.serialNumber}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
                <Button variant="outline" className="flex-1 h-12" onClick={() => setShowDeleteStep2(false)}>
                  <X className="mr-2 h-4 w-4" /> Back
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
};

export default Infrastructure;
