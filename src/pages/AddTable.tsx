import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus, Zap } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { addTableToPlant, getPlantDetails, PlantDetails } from '@/lib/realFileSystem';
import { validateUserCompany } from '@/lib/companySync';
import { useToast } from '@/hooks/use-toast';
import BackButton from '@/components/ui/BackButton';

const AddTable = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const user = getCurrentUser();
  const [formData, setFormData] = useState({
    panelCount: '20',
    voltagePerPanel: '',
    currentPerPanel: '',
  });
  const [plantDetails, setPlantDetails] = useState<PlantDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [validationErrors, setValidationErrors] = useState({
    panelCount: '',
  });
  const [nextTableNumber, setNextTableNumber] = useState<string>('');

  // Real-time validation function
  const validatePanelCount = (value: string) => {
    const numValue = parseInt(value);

    if (value === '') {
      setValidationErrors(prev => ({ ...prev, panelCount: '' }));
      return;
    }

    if (isNaN(numValue) || numValue < 0) {
      setValidationErrors(prev => ({ ...prev, panelCount: 'Must be a positive number' }));
      return;
    }

    if (numValue > 20) {
      setValidationErrors(prev => ({ ...prev, panelCount: 'Maximum 20 panels allowed per Node' }));
      return;
    }

    setValidationErrors(prev => ({ ...prev, panelCount: '' }));
  };

  // Load plant details to get default voltage and current values
  useEffect(() => {
    const loadPlantDetails = async () => {
      if (!user || !user.companyId) {
        setLoading(false);
        return;
      }

      try {
        const details = await getPlantDetails(user.companyId);
        if (details) {
          setPlantDetails(details);
          // Pre-fill form with company default values
          setFormData(prev => ({
            ...prev,
            voltagePerPanel: details.voltagePerPanel?.toString() || '20',
            currentPerPanel: details.currentPerPanel?.toString() || '10',
          }));

          // Compute next table number from existing tables
          const tables = details.tables || [];
          let maxNum = 0;
          for (const t of tables) {
            // Check for both TBL and Node prefixes
            const sn: string = t.node || t.serialNumber || '';
            const m = sn.match(/(\d+)/);
            if (m) {
              const n = parseInt(m[1], 10);
              // Ignore timestamps (extremely large numbers) in sequence calculation
              if (!isNaN(n) && n < 10000 && n >= maxNum) {
                maxNum = n;
              }
            }
          }
          const pad = (n: number) => n.toString().padStart(3, '0');
          const nextNumber = `Node-${pad((maxNum + 1) || 1)}`;
          setNextTableNumber(nextNumber);
        }
      } catch (error) {
        console.error('Error loading plant details:', error);
        // Use default values if loading fails
        setFormData(prev => ({
          ...prev,
          voltagePerPanel: '20',
          currentPerPanel: '10',
        }));
      } finally {
        setLoading(false);
      }
    };

    setNextTableNumber('Node-001'); // Safe default
    loadPlantDetails();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !user.companyId) {
      toast({
        title: 'Error',
        description: 'User not authenticated',
        variant: 'destructive',
      });
      return;
    }

    const panelCount = isNaN(parseInt(formData.panelCount)) ? 0 : parseInt(formData.panelCount);
    const voltagePerPanel = parseFloat(formData.voltagePerPanel);
    const currentPerPanel = parseFloat(formData.currentPerPanel);

    if (panelCount <= 0) {
      toast({
        title: 'Invalid Input',
        description: 'Number of panels must be positive',
        variant: 'destructive',
      });
      return;
    }

    if (panelCount > 20) {
      toast({
        title: 'Invalid Input',
        description: 'Maximum 20 panels allowed per Node',
        variant: 'destructive',
      });
      return;
    }

    if (voltagePerPanel <= 0 || currentPerPanel <= 0) {
      toast({
        title: 'Invalid Input',
        description: 'Voltage and current per panel must be positive',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Validate user's company exists in backend
      const validation = await validateUserCompany();
      if (!validation.isValid) {
        toast({
          title: 'Company Validation Error',
          description: validation.message || 'Your company is not properly configured in the backend system.',
          variant: 'destructive',
        });
        return;
      }

      // Add table to company plant details
      const plantTableResult = await addTableToPlant(
        user.companyId,
        panelCount,
        nextTableNumber,
        voltagePerPanel,
        currentPerPanel
      );

      const powerPerPanel = voltagePerPanel * currentPerPanel;

      toast({
        title: 'Success!',
        description: `Node ${plantTableResult.table.node} created with ${panelCount} panels (${powerPerPanel}W per panel)`,
      });

      navigate('/plant-admin-dashboard/infrastructure');
    } catch (error) {
      console.error('Error creating table:', error);
      toast({
        title: 'Error',
        description: 'Failed to create Node. Please contact the administrator.',
        variant: 'destructive',
      });
    }
  };

  if (!user || user.role !== 'plant_admin') {
    navigate('/login');
    return null;
  }

  return (
    <>
      <div className="absolute top-4 left-4 z-10">
        <BackButton />
      </div>
      <style>{`
        .not-allowed-button {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 15px 20px;
          background-color: #212121;
          border: none;
          font: inherit;
          color: #e8e8e8;
          font-size: 20px;
          font-weight: 600;
          border-radius: 50px;
          cursor: not-allowed;
          overflow: hidden;
          transition: all 0.3s ease cubic-bezier(0.23, 1, 0.320, 1);
          margin: 20px auto;
          width: fit-content;
        }

        .not-allowed-button span {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
        }

        .not-allowed-button::before {
          position: absolute;
          content: '';
          width: 100%;
          height: 100%;
          translate: 0 105%;
          background-color: #F53844;
          transition: all 0.3s cubic-bezier(0.23, 1, 0.320, 1);
        }

        .not-allowed-button svg {
          width: 32px;
          height: 32px;
          fill: #F53844;
          transition: all 0.3s cubic-bezier(0.23, 1, 0.320, 1);
        }

        .not-allowed-button:hover {
          animation: shake 0.2s linear 1;
        }

        .not-allowed-button:hover::before {
          translate: 0 0;
        }

        .not-allowed-button:hover svg {
          fill: #e8e8e8;
        }

        @keyframes shake {
          0% {
            rotate: 0deg;
          }
        }
      `}</style>
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <div className="container max-w-2xl mx-auto py-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/plant-admin-dashboard/infrastructure')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Infrastructure
          </Button>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Plus className="h-6 w-6 text-primary" />
                Add New Node
              </CardTitle>
              <CardDescription>
                Configure panel layout for the new node. Maximum 20 panels per node.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Node Number (auto sequence) */}
                <div className="space-y-2">
                  <Label>Node Number (Next in sequence)</Label>
                  <Input value={nextTableNumber || '—'} readOnly className="h-12 bg-muted font-semibold" />
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="panelCount">Number of Panels</Label>
                    <Input
                      id="panelCount"
                      type="number"
                      min="0"
                      max="20"
                      value={formData.panelCount}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData({ ...formData, panelCount: value });
                        validatePanelCount(value);
                      }}
                      placeholder="20"
                      className={`h-12 field-light-blue ${validationErrors.panelCount ? 'border-red-500 focus:border-red-500' : ''}`}
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum 20 panels per node
                    </p>
                    {validationErrors.panelCount && (
                      <p className="text-xs text-red-500 font-medium">
                        ⚠️ {validationErrors.panelCount}
                      </p>
                    )}
                  </div>

                  {/* Panel Specifications */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" />
                      Panel Specifications
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="voltagePerPanel">Voltage per Panel (V)</Label>
                        <Input
                          id="voltagePerPanel"
                          type="number"
                          step="0.1"
                          min="0.1"
                          value={formData.voltagePerPanel}
                          onChange={(e) => setFormData({ ...formData, voltagePerPanel: e.target.value })}
                          placeholder="20"
                          required
                          className="h-12 field-light-blue"
                        />
                        <p className="text-xs text-muted-foreground">
                          Default: {plantDetails?.voltagePerPanel || 20}V
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="currentPerPanel">Current per Panel (A)</Label>
                        <Input
                          id="currentPerPanel"
                          type="number"
                          step="0.1"
                          min="0.1"
                          value={formData.currentPerPanel}
                          onChange={(e) => setFormData({ ...formData, currentPerPanel: e.target.value })}
                          placeholder="10"
                          required
                          className="h-12 field-light-blue"
                        />
                        <p className="text-xs text-muted-foreground">
                          Default: {plantDetails?.currentPerPanel || 10}A
                        </p>
                      </div>
                    </div>

                    {/* Power Calculation */}
                    {formData.voltagePerPanel && formData.currentPerPanel && (
                      <div className="p-4 bg-accent/20 rounded-lg border border-accent">
                        <p className="text-sm font-semibold">Power per Panel</p>
                        <p className="text-2xl font-bold text-primary">
                          {parseFloat(formData.voltagePerPanel || '0') * parseFloat(formData.currentPerPanel || '0')}W
                        </p>
                      </div>
                    )}
                  </div>

                  {(formData.panelCount !== '') && (
                    <div className="p-4 bg-accent/20 rounded-lg border border-accent">
                      <p className="text-sm font-semibold">Total Panels</p>
                      <p className="text-3xl font-bold text-primary">
                        {isNaN(parseInt(formData.panelCount)) ? 0 : parseInt(formData.panelCount)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Capacity: 20 panels max
                      </p>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 gradient-primary"
                  disabled={loading || validationErrors.panelCount !== ''}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {loading ? 'Loading...' : 'Create Node'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Not Allowed Button - Shows when validation errors exist */}
          {(validationErrors.panelCount !== '') && (
            <button className="not-allowed-button">
              <span>Not allowed!</span>
              <span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeMiterlimit="2" strokeLinejoin="round" fillRule="evenodd" clipRule="evenodd">
                  <path fillRule="nonzero" d="m12.002 2.005c5.518 0 9.998 4.48 9.998 9.997 0 5.518-4.48 9.998-9.998 9.998-5.517 0-9.997-4.48-9.997-9.998 0-5.517 4.48-9.997 9.997-9.997zm0 1.5c-4.69 0-8.497 3.807-8.497 8.497s3.807 8.498 8.497 8.498 8.498-3.808 8.498-8.498-3.808-8.497-8.498-8.497zm0 7.425 2.717-2.718c.146-.146.339-.219.531-.219.404 0 .75.325.75.75 0 .193-.073.384-.219.531l-2.717 2.717 2.727 2.728c.147.147.22.339.22.531 0 .427-.349.75-.75.75-.192 0-.384-.073-.53-.219l-2.729-2.728-2.728 2.728c-.146.146-.338.219-.53.219-.401 0-.751-.323-.751-.75 0-.192.073-.384.22-.531l2.728-2.728-2.722-2.722c-.146-.147-.219-.338-.219-.531 0-.425.346-.749.75-.749.192 0 .385.073.531.219z"></path>
                </svg>
              </span>
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default AddTable;
