import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Eye, Zap, Activity, Grid3X3 } from 'lucide-react';
import { toast } from 'sonner';
import PanelMonitor from '@/components/panels/PanelMonitor';

interface InfrastructureViewProps {
  onBack: () => void;
}

type ViewMode = 'main' | 'addTable' | 'viewTables';

interface TableData {
  id: string;
  serialNumber: string;
  topPanels: number;
  bottomPanels: number;
  companyName?: string; // Make optional since PlantTable doesn't have it
}

const InfrastructureView = ({ onBack }: InfrastructureViewProps) => {
  const { user, companies, updateCompany } = useAuth();
  
  // Get current company data for key generation
  const currentCompany = companies.find(c => c.name === user?.companyName);
  const [viewMode, setViewMode] = useState<ViewMode>('main');
  const [tables, setTables] = useState<TableData[]>([]);
  const [newTable, setNewTable] = useState({
    topPanels: 10,
    bottomPanels: 10
  });

  const company = companies.find(c => c.name === user?.companyName);
  
  // Calculate total panels from all tables
  const totalPanels = tables.reduce((sum, table) => sum + table.topPanels + table.bottomPanels, 0);
  
  // Calculate per-panel averages (assuming panelCurrent is total current)
  const avgPanelCurrent = totalPanels > 0 ? (company?.panelCurrent || 0) / totalPanels : (company?.panelCurrent || 0);

  useEffect(() => {
    // Tables now loaded from backend API
    const loadTables = async () => {
      try {
        const { getPlantDetails } = await import('@/lib/realFileSystem');
        if (user && 'companyId' in user && user.companyId) {
          const plantDetails = await getPlantDetails(user.companyId as string);
          if (plantDetails?.tables) {
            // Map PlantTable to TableData format
            const mappedTables: TableData[] = plantDetails.tables.map(table => ({
              id: table.id,
              serialNumber: table.serialNumber,
              topPanels: table.panelsTop,
              bottomPanels: table.panelsBottom,
              companyName: user.companyName
            }));
            setTables(mappedTables);
          }
        }
      } catch (error) {
        console.error('Error loading tables from backend:', error);
        setTables([]);
      }
    };
    
    loadTables();
  }, [user]);

  const saveTables = (updatedTables: TableData[]) => {
    setTables(updatedTables);
    // Table saving now handled by backend API
  };

  const handleAddTable = () => {
    const newTableData: TableData = {
      id: `table-${Date.now()}`,
      serialNumber: `TBL-${String(tables.length + 1).padStart(4, '0')}`,
      topPanels: newTable.topPanels,
      bottomPanels: newTable.bottomPanels,
      companyName: user?.companyName || ''
    };

    const updatedTables = [...tables, newTableData];
    saveTables(updatedTables);

    if (company) {
      updateCompany(company.id, { totalTables: updatedTables.length });
    }

    toast.success('Table added successfully!');
    setNewTable({ topPanels: 10, bottomPanels: 10 });
    setViewMode('main');
  };

  if (viewMode === 'viewTables') {
    return (
      <div className="min-h-screen p-6">
        <Button onClick={() => setViewMode('main')} variant="ghost" className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Infrastructure
        </Button>
        <PanelMonitor 
          key={`infrastructure-${user?.companyName}-${currentCompany?.totalTables}-${currentCompany?.tableConfigs?.length || 0}`}
          companyName={user?.companyName || ''} 
        />
      </div>
    );
  }

  if (viewMode === 'addTable') {
    return (
      <div className="min-h-screen p-6">
        <Button onClick={() => setViewMode('main')} variant="ghost" className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Infrastructure
        </Button>

        <div className="max-w-2xl mx-auto">
          <div className="glass-panel p-8">
            <h2 className="text-3xl font-bold mb-6">Add New Table</h2>

            <div className="space-y-6">
              <div className="glass-card p-4">
                <p className="text-sm text-muted-foreground mb-2">Auto-generated Serial Number</p>
                <p className="text-2xl font-bold text-primary">
                  TBL-{String(tables.length + 1).padStart(4, '0')}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="topPanels">Top Row Panel Count</Label>
                <Input
                  id="topPanels"
                  type="number"
                  min="1"
                  max="50"
                  value={newTable.topPanels}
                  onChange={(e) => setNewTable({ ...newTable, topPanels: parseInt(e.target.value) || 0 })}
                  className="glass-card"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bottomPanels">Bottom Row Panel Count</Label>
                <Input
                  id="bottomPanels"
                  type="number"
                  min="1"
                  max="50"
                  value={newTable.bottomPanels}
                  onChange={(e) => setNewTable({ ...newTable, bottomPanels: parseInt(e.target.value) || 0 })}
                  className="glass-card"
                />
              </div>

              <div className="glass-card p-4">
                <p className="text-sm text-muted-foreground mb-2">Total Panels in This Table</p>
                <p className="text-2xl font-bold">{newTable.topPanels + newTable.bottomPanels} panels</p>
              </div>

              <Button
                onClick={handleAddTable}
                className="w-full gradient-primary text-white py-6 text-lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Table
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <Button onClick={onBack} variant="ghost" className="mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Button>

      {/* Infrastructure Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
        <Card className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Plant Power</p>
              <p className="text-2xl font-bold text-primary">
                {company && company.plantPowerKW >= 1000
                  ? `${(company.plantPowerKW / 1000).toFixed(2)} MW`
                  : `${company?.plantPowerKW} kW`}
              </p>
            </div>
            <Zap className="w-10 h-10 text-primary" />
          </div>
        </Card>

        <Card className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Avg Panel Voltage</p>
              <p className="text-2xl font-bold">{company?.panelVoltage}V</p>
              <p className="text-xs text-muted-foreground">per panel</p>
            </div>
            <Activity className="w-10 h-10 text-accent" />
          </div>
        </Card>

        <Card className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Avg Panel Current</p>
              <p className="text-2xl font-bold">{avgPanelCurrent?.toFixed(2)}A</p>
              <p className="text-xs text-muted-foreground">per panel</p>
            </div>
            <Activity className="w-10 h-10 text-green-500" />
          </div>
        </Card>

        <Card className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Tables</p>
              <p className="text-2xl font-bold">{tables.length}</p>
              <p className="text-xs text-muted-foreground">panel tables</p>
            </div>
            <Grid3X3 className="w-10 h-10 text-orange-500" />
          </div>
        </Card>

        <Card className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Panels</p>
              <p className="text-2xl font-bold">{totalPanels}</p>
              <p className="text-xs text-muted-foreground">solar panels</p>
            </div>
            <Activity className="w-10 h-10 text-blue-500" />
          </div>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card
          className="glass-card p-8 hover:scale-105 transition-transform cursor-pointer"
          onClick={() => setViewMode('addTable')}
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mb-4 glow-effect">
              <Plus className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Add Tables</h3>
            <p className="text-muted-foreground">
              Add new panel tables with auto-generated serial numbers
            </p>
          </div>
        </Card>

        <Card
          className="glass-card p-8 hover:scale-105 transition-transform cursor-pointer"
          onClick={() => setViewMode('viewTables')}
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-accent/20 border-2 border-accent flex items-center justify-center mb-4">
              <Eye className="w-10 h-10 text-accent" />
            </div>
            <h3 className="text-2xl font-bold mb-2">View Tables</h3>
            <p className="text-muted-foreground">
              Monitor panel health, faults, and repair status
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default InfrastructureView;
