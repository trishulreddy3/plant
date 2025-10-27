import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus, Shield, Mail, Zap } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { addTable } from '@/lib/data';
import { addTableToPlant, getPlantDetails, PlantDetails } from '@/lib/realFileSystem';
import { validateUserCompany } from '@/lib/companySync';
import { useToast } from '@/hooks/use-toast';
import BackButton from '@/components/ui/BackButton';

const AddTable = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const user = getCurrentUser();
  const [formData, setFormData] = useState({
    panelsTop: '',
    panelsBottom: '',
    voltagePerPanel: '',
    currentPerPanel: '',
  });
  const [plantDetails, setPlantDetails] = useState<PlantDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [validationErrors, setValidationErrors] = useState({
    panelsTop: '',
    panelsBottom: '',
  });

  // Real-time validation function
  const validatePanelCount = (field: 'panelsTop' | 'panelsBottom', value: string) => {
    const numValue = parseInt(value);
    
    if (value === '') {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
      return;
    }
    
    if (isNaN(numValue) || numValue < 0) {
      setValidationErrors(prev => ({ ...prev, [field]: 'Must be a positive number' }));
      return;
    }
    
    if (numValue > 20) {
      setValidationErrors(prev => ({ ...prev, [field]: 'Maximum 20 panels allowed per row' }));
      return;
    }
    
    setValidationErrors(prev => ({ ...prev, [field]: '' }));
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

    const panelsTop = parseInt(formData.panelsTop);
    const panelsBottom = parseInt(formData.panelsBottom);
    const voltagePerPanel = parseFloat(formData.voltagePerPanel);
    const currentPerPanel = parseFloat(formData.currentPerPanel);

    if (panelsTop < 0 || panelsBottom < 0) {
      toast({
        title: 'Invalid Input',
        description: 'Number of panels must be positive',
        variant: 'destructive',
      });
      return;
    }

    if (panelsTop > 20 || panelsBottom > 20) {
      toast({
        title: 'Invalid Input',
        description: 'Maximum 20 panels allowed per row (top and bottom)',
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

      // Add table to company plant details file with realistic power arrays
      const plantTableResult = await addTableToPlant(user.companyId, panelsTop, panelsBottom);
      
      // Also add to legacy system for compatibility
      const table = addTable(user.companyId, panelsTop, panelsBottom, user.email);

      // Calculate power per panel using custom values
      const powerPerPanel = voltagePerPanel * currentPerPanel;

      toast({
        title: 'Success!',
        description: `Table ${table.serialNumber} created with ${panelsTop + panelsBottom} panels (${powerPerPanel}W per panel)`,
      });

      navigate('/infrastructure');
    } catch (error) {
      console.error('Error creating table:', error);
      toast({
        title: 'Error',
        description: 'Failed to create table. The company may not exist in the backend system. Please contact the super admin.',
        variant: 'destructive',
      });
    }
  };

  if (!user || user.role !== 'plant_admin') {
    navigate('/admin-login');
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
          33% {
            rotate: 10deg;
          }
          66% {
            rotate: -10deg;
          }
          100% {
            rotate: 10deg;
          }
        }
      `}</style>
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="container max-w-2xl mx-auto py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/infrastructure')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Infrastructure
        </Button>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Plus className="h-6 w-6 text-primary" />
              Add New Table
            </CardTitle>
            <CardDescription>
              Configure panel layout for the new table. Maximum 20 panels per row (top and bottom). Serial number will be generated automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="panelsTop">Number of Panels (Top Row)</Label>
                  <Input
                    id="panelsTop"
                    type="number"
                    min="0"
                    max="20"
                    value={formData.panelsTop}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData({ ...formData, panelsTop: value });
                      validatePanelCount('panelsTop', value);
                    }}
                    placeholder="10"
                    required
                    className={`h-12 ${validationErrors.panelsTop ? 'border-red-500 focus:border-red-500' : ''}`}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum 20 panels per row
                  </p>
                  {validationErrors.panelsTop && (
                    <p className="text-xs text-red-500 font-medium">
                      ⚠️ {validationErrors.panelsTop}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="panelsBottom">Number of Panels (Bottom Row)</Label>
                  <Input
                    id="panelsBottom"
                    type="number"
                    min="0"
                    max="20"
                    value={formData.panelsBottom}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData({ ...formData, panelsBottom: value });
                      validatePanelCount('panelsBottom', value);
                    }}
                    placeholder="10"
                    required
                    className={`h-12 ${validationErrors.panelsBottom ? 'border-red-500 focus:border-red-500' : ''}`}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum 20 panels per row
                  </p>
                  {validationErrors.panelsBottom && (
                    <p className="text-xs text-red-500 font-medium">
                      ⚠️ {validationErrors.panelsBottom}
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
                        className="h-12"
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
                        className="h-12"
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

                {formData.panelsTop && formData.panelsBottom && (
                  <div className="p-4 bg-accent/20 rounded-lg border border-accent">
                    <p className="text-sm font-semibold">Total Panels</p>
                    <p className="text-3xl font-bold text-primary">
                      {parseInt(formData.panelsTop || '0') + parseInt(formData.panelsBottom || '0')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Top: {formData.panelsTop} panels | Bottom: {formData.panelsBottom} panels
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Maximum capacity: 40 panels per table (20 top + 20 bottom)
                    </p>
                  </div>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 gradient-primary" 
                disabled={loading || validationErrors.panelsTop !== '' || validationErrors.panelsBottom !== ''}
              >
                <Plus className="mr-2 h-4 w-4" />
                {loading ? 'Loading...' : 'Create Table'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Not Allowed Button - Shows when validation errors exist */}
        {(validationErrors.panelsTop !== '' || validationErrors.panelsBottom !== '') && (
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

      {/* Company Information Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 mt-8">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Company Info */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Microsyslogic</h3>
              <p className="text-sm text-gray-600 mb-3">
                Advanced solar plant monitoring and management system for optimal energy production.
              </p>
              <div className="flex items-center text-sm text-gray-500">
                <Shield className="h-4 w-4 mr-2" />
                <span>Secure & Compliant</span>
              </div>
            </div>

              {/* Contact */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Contact</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  <a href="mailto:SuperAdmin.Microsyslogic@gmail.com" className="hover:text-primary">
                    SuperAdmin.Microsyslogic@gmail.com
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-200 mt-6 pt-4 flex flex-col sm:flex-row justify-between items-center text-sm text-gray-500">
            <div>
              © 2025 Microsyslogic. All rights reserved.
            </div>
            <div className="flex items-center space-x-4 mt-2 sm:mt-0">
            </div>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
};

export default AddTable;
