import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, X, Activity } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { updateTableInPlant, updatePlantSettings, getPlantDetails, PlantDetails } from '@/lib/realFileSystem';
import { useToast } from '@/hooks/use-toast';

interface TableInfo {
  id: string;
  serialNumber: string;
  node?: string; // Support new naming
  panelCount?: number;
  panelsTop?: number;
  panelsBottom?: number;
  panelsCount?: number; // fallback
  panelVoltages?: number[];
  voltagePerPanel?: number;
  currentPerPanel?: number;
}

const EditTable = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [user] = useState(getCurrentUser());
  const table = (location.state?.table || null) as TableInfo | null;

  const [form, setForm] = useState({
    serialNumber: '',
    panelCount: '',
    voltagePerPanel: '',
    currentPerPanel: '',
  });
  const [plant, setPlant] = useState<PlantDetails | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'plant_admin') {
      navigate('/login');
      return;
    }
    if (!table) {
      navigate('/plant-admin-dashboard/infrastructure');
      return;
    }
    (async () => {
      try {
        const details = await getPlantDetails(user.companyId);
        setPlant(details);

        // Determine current panel count
        let count = 0;
        if (typeof table.panelCount === 'number') count = table.panelCount;
        else if (table.panelVoltages) count = table.panelVoltages.length;
        else count = (table.panelsTop || 0) + (table.panelsBottom || 0);

        setForm({
          serialNumber: table.node || table.serialNumber || '',
          panelCount: String(count),
          voltagePerPanel: String(table.voltagePerPanel ?? details?.voltagePerPanel ?? 20),
          currentPerPanel: String(table.currentPerPanel ?? details?.currentPerPanel ?? 10),
        });
      } catch (e) {
        // fallback
        setForm({
          serialNumber: table.node || table.serialNumber || '',
          panelCount: '20',
          voltagePerPanel: '20',
          currentPerPanel: '10',
        });
      }
    })();
  }, [user, table, navigate]);

  const hasChanges = () => {
    if (!table) return false;
    const count = parseInt(form.panelCount);
    const v = parseFloat(form.voltagePerPanel);
    const c = parseFloat(form.currentPerPanel);

    // Check if count matches previous
    let prevCount = 0;
    if (typeof table.panelCount === 'number') prevCount = table.panelCount;
    else if (table.panelVoltages) prevCount = table.panelVoltages.length;
    else prevCount = (table.panelsTop || 0) + (table.panelsBottom || 0);

    return (
      form.serialNumber !== (table.node || table.serialNumber || '') ||
      count !== prevCount ||
      v !== (table.voltagePerPanel ?? plant?.voltagePerPanel ?? 20) ||
      c !== (table.currentPerPanel ?? plant?.currentPerPanel ?? 10)
    );
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.companyId || !table) return;

    const count = parseInt(form.panelCount);
    const v = parseFloat(form.voltagePerPanel);
    const c = parseFloat(form.currentPerPanel);

    if (isNaN(count) || count < 0 || count > 20) {
      toast({ title: 'Invalid input', description: 'Panels must be between 0 and 20', variant: 'destructive' });
      return;
    }
    if (isNaN(v) || isNaN(c) || v <= 0 || c <= 0) {
      toast({ title: 'Invalid input', description: 'Voltage and Current must be positive numbers', variant: 'destructive' });
      return;
    }

    try {
      // Update the specific table only
      const tableId = table.node || table.id || table.serialNumber;
      await updateTableInPlant(user.companyId, tableId, count, form.serialNumber.trim(), v, c);
      toast({ title: 'Saved', description: `${form.serialNumber} updated with ${count} panels` });
      navigate('/plant-admin-dashboard/infrastructure');
    } catch (err) {
      console.error('Failed to update node', err);
      toast({ title: 'Error', description: 'Failed to update node', variant: 'destructive' });
    }
  };

  if (!table) return null;

  const count = parseInt(form.panelCount || '0') || 0;
  const v = parseFloat(form.voltagePerPanel || '0') || 0;
  const c = parseFloat(form.currentPerPanel || '0') || 0;
  const maxPower = v * c * count;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <header className="glass-header sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/plant-admin-dashboard/infrastructure')}
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Infrastructure
          </Button>
          <h1 className="text-2xl font-bold text-primary">Edit {table.node || table.serialNumber || 'Node'}</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Update Node Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="serialNumber">Node ID</Label>
                <Input id="serialNumber" value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} className="field-light-blue" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="panelCount">Number of Panels (0-20)</Label>
                <Input
                  type="number"
                  min="0"
                  max="25"
                  id="panelCount"
                  value={form.panelCount}
                  onChange={(e) => setForm({ ...form, panelCount: e.target.value })}
                  className={`field-light-blue ${parseInt(form.panelCount) > 20 ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                />
                {parseInt(form.panelCount) > 20 && (
                  <p className="text-sm font-semibold text-red-600 animate-pulse">
                    ⚠️ Max panel count exceeded! Limit is 20.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="voltagePerPanel">Voltage per Panel (V)</Label>
                  <Input id="voltagePerPanel" value={form.voltagePerPanel} onChange={(e) => setForm({ ...form, voltagePerPanel: e.target.value })} className="field-light-blue" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentPerPanel">Current per Panel (A)</Label>
                  <Input id="currentPerPanel" value={form.currentPerPanel} onChange={(e) => setForm({ ...form, currentPerPanel: e.target.value })} className="field-light-blue" />
                </div>
              </div>

              <div className="mt-6 p-4 rounded-md border bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-primary" />
                  <span className="font-semibold">Calculated</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Max Power Generating</div>
                    <div className="font-medium">{isFinite(maxPower) ? `${Math.round(maxPower)}W` : '—'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Total Panels</div>
                    <div className="font-medium">{isFinite(count) ? count : '—'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Per Panel Power</div>
                    <div className="font-medium">{isFinite(v * c) ? `${Math.round(v * c)}W` : '—'}</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={!hasChanges() || parseInt(form.panelCount) > 20}
                  className={`flex-1 ${(!hasChanges() || parseInt(form.panelCount) > 20) ? 'bg-gray-400 cursor-not-allowed opacity-50' : 'gradient-primary'}`}
                >
                  <Save className="mr-2 h-4 w-4" /> Save Changes
                </Button>
                <Button type="button" variant="outline" className="flex-1" onClick={() => navigate('/plant-admin-dashboard/infrastructure')}>
                  <X className="mr-2 h-4 w-4" /> Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default EditTable;
