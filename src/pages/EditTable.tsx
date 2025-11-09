import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, X, Activity } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { updateTableInPlant, updatePlantSettings, getPlantDetails, PlantDetails } from '@/lib/realFileSystem';
import BackButton from '@/components/ui/BackButton';
import { useToast } from '@/hooks/use-toast';

interface TableInfo {
  id: string;
  serialNumber: string;
  panelsTop: number;
  panelsBottom: number;
}

const EditTable = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [user] = useState(getCurrentUser());
  const table = (location.state?.table || null) as TableInfo | null;

  const [form, setForm] = useState({
    serialNumber: '',
    panelsTop: '',
    panelsBottom: '',
    voltagePerPanel: '',
    currentPerPanel: '',
  });
  const [plant, setPlant] = useState<PlantDetails | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'plant_admin') {
      navigate('/admin-login');
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
        setForm({
          serialNumber: table.serialNumber || '',
          panelsTop: String(table.panelsTop ?? 0),
          panelsBottom: String(table.panelsBottom ?? 0),
          voltagePerPanel: String(details?.voltagePerPanel ?? 20),
          currentPerPanel: String(details?.currentPerPanel ?? 10),
        });
      } catch (e) {
        // fallback
        setForm({
          serialNumber: table.serialNumber || '',
          panelsTop: String(table.panelsTop ?? 0),
          panelsBottom: String(table.panelsBottom ?? 0),
          voltagePerPanel: '20',
          currentPerPanel: '10',
        });
      }
    })();
  }, [user, table, navigate]);

  const hasChanges = () => {
    if (!table) return false;
    const top = parseInt(form.panelsTop);
    const bottom = parseInt(form.panelsBottom);
    const v = parseFloat(form.voltagePerPanel);
    const c = parseFloat(form.currentPerPanel);
    return (
      form.serialNumber !== (table.serialNumber || '') ||
      top !== (table.panelsTop ?? 0) ||
      bottom !== (table.panelsBottom ?? 0) ||
      (plant && (v !== plant.voltagePerPanel || c !== plant.currentPerPanel))
    );
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.companyId || !table) return;

    const top = parseInt(form.panelsTop);
    const bottom = parseInt(form.panelsBottom);
    const v = parseFloat(form.voltagePerPanel);
    const c = parseFloat(form.currentPerPanel);

    if (isNaN(top) || isNaN(bottom) || top < 0 || bottom < 0 || top > 20 || bottom > 20) {
      toast({ title: 'Invalid input', description: 'Panels per row must be between 0 and 20', variant: 'destructive' });
      return;
    }
    if (isNaN(v) || isNaN(c) || v <= 0 || c <= 0) {
      toast({ title: 'Invalid input', description: 'Voltage and Current must be positive numbers', variant: 'destructive' });
      return;
    }

    try {
      // If plant settings changed, update them first
      if (plant && (v !== plant.voltagePerPanel || c !== plant.currentPerPanel)) {
        await updatePlantSettings(user.companyId, v, c);
      }
      await updateTableInPlant(user.companyId, table.id, top, bottom, form.serialNumber.trim());
      toast({ title: 'Saved', description: `${table.serialNumber} updated` });
      navigate('/plant-admin-dashboard/infrastructure');
    } catch (err) {
      console.error('Failed to update table', err);
      toast({ title: 'Error', description: 'Failed to update table', variant: 'destructive' });
    }
  };

  if (!table) return null;

  const top = parseInt(form.panelsTop || '0') || 0;
  const bottom = parseInt(form.panelsBottom || '0') || 0;
  const totalPanels = top + bottom;
  const v = parseFloat(form.voltagePerPanel || '0') || 0;
  const c = parseFloat(form.currentPerPanel || '0') || 0;
  const maxPower = v * c * totalPanels;

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
          <h1 className="text-2xl font-bold text-primary">Edit {table.serialNumber}</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Update Table Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="serialNumber">Table No</Label>
                <Input id="serialNumber" value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="panelsTop">Top Row Panels (0-20)</Label>
                <Input id="panelsTop" value={form.panelsTop} onChange={(e) => setForm({ ...form, panelsTop: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="panelsBottom">Bottom Row Panels (0-20)</Label>
                <Input id="panelsBottom" value={form.panelsBottom} onChange={(e) => setForm({ ...form, panelsBottom: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="voltagePerPanel">Voltage per Panel (V)</Label>
                  <Input id="voltagePerPanel" value={form.voltagePerPanel} onChange={(e) => setForm({ ...form, voltagePerPanel: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentPerPanel">Current per Panel (A)</Label>
                  <Input id="currentPerPanel" value={form.currentPerPanel} onChange={(e) => setForm({ ...form, currentPerPanel: e.target.value })} />
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
                    <div className="font-medium">{isFinite(totalPanels) ? totalPanels : '—'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Per Panel Power</div>
                    <div className="font-medium">{isFinite(v * c) ? `${Math.round(v * c)}W` : '—'}</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={!hasChanges()} className={`flex-1 ${!hasChanges() ? 'bg-gray-400 cursor-not-allowed' : ''}`}>
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
