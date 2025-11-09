import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Building2, Save, Eye, EyeOff } from 'lucide-react';
import { addCompany, addPlantAdmin } from '@/lib/auth';
import { createCompanyFolder } from '@/lib/realFileSystem';
import { addActivityLog } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import BackButton from '@/components/ui/BackButton';

const AddCompany = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    plantPower: '',
    plantPowerUnit: 'KW',
    voltagePerPanel: '20',
    currentPerPanel: '10',
    adminEmail: '',
    adminPassword: '',
    adminName: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const voltagePerPanel = parseFloat(formData.voltagePerPanel);
      const currentPerPanel = parseFloat(formData.currentPerPanel);
      const powerPerPanel = voltagePerPanel * currentPerPanel;
      
      // Convert plant power to KW
      const plantPowerValue = parseFloat(formData.plantPower);
      const plantPowerKW = formData.plantPowerUnit === 'MW' ? plantPowerValue * 1000 : plantPowerValue;
      
      // Create company in auth system
      const company = addCompany({
        name: formData.name,
        plantPowerKW: plantPowerKW,
        panelVoltage: voltagePerPanel,
        panelCurrent: currentPerPanel,
        totalTables: 0,
        adminId: '', // Will be updated after creating admin
      });

      // Create admin account
      const admin = addPlantAdmin(formData.adminEmail, formData.adminPassword, company.id);

      // Create actual physical company folder with files
      const result = await createCompanyFolder(
        company.id,
        formData.name,
        voltagePerPanel,
        currentPerPanel,
        plantPowerKW,
        formData.adminEmail,
        formData.adminPassword,
        formData.adminName
      );

      // Log activity for super admin monitoring
      addActivityLog(
        company.id,
        formData.name,
        'create',
        'company',
        company.id,
        formData.name,
        `Created company with ${voltagePerPanel}V/${currentPerPanel}A panels (${powerPerPanel}W per panel)`,
        'super_admin'
      );

      toast({
        title: 'Success!',
        description: `Company "${formData.name}" created with ${plantPowerValue} ${formData.plantPowerUnit} plant power and ${voltagePerPanel}V/${currentPerPanel}A panels (${powerPerPanel}W per panel). Physical folder created at: ${result.companyPath}`,
      });

      navigate('/super-admin-dashboard');
    } catch (error) {
      console.error('Error creating company:', error);
      toast({
        title: 'Error',
        description: 'Failed to create company. Please make sure the backend server is running.',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <style>{`
        .custom-button {
          cursor: pointer;
          position: relative;
          padding: 8px 20px;
          font-size: 16px;
          color: rgb(193, 163, 98);
          border: 2px solid rgb(193, 163, 98);
          border-radius: 28px;
          background-color: transparent;
          font-weight: 600;
          transition: all 0.3s cubic-bezier(0.23, 1, 0.320, 1);
          overflow: hidden;
          width: 80%;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .custom-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-radius: inherit;
          scale: 0;
          z-index: -1;
          background-color: rgb(193, 163, 98);
          transition: all 0.6s cubic-bezier(0.23, 1, 0.320, 1);
        }

        .custom-button:hover::before {
          scale: 1;
        }

        .custom-button:hover {
          color: #212121;
          scale: 1.1;
          box-shadow: 0 0px 20px rgba(193, 163, 98, 0.4);
        }

        .custom-button:active {
          scale: 1;
        }
      `}</style>
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="absolute top-4 left-4 z-10">
        <BackButton />
      </div>
      <div className="container max-w-2xl mx-auto py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/super-admin-dashboard')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Building2 className="h-6 w-6 text-primary" />
              Add New Company
            </CardTitle>
            <CardDescription>
              Create a new solar plant company and administrator account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Company Information</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="name">Company Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter company name"
                    required
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plantPower">Total Plant Power</Label>
                  <div className="flex gap-2">
                    <Input
                      id="plantPower"
                      type="number"
                      step="0.01"
                      value={formData.plantPower}
                      onChange={(e) => setFormData({ ...formData, plantPower: e.target.value })}
                      placeholder="1000"
                      required
                      className="h-12 flex-1"
                    />
                    <Select
                      value={formData.plantPowerUnit}
                      onValueChange={(value) => setFormData({ ...formData, plantPowerUnit: value })}
                    >
                      <SelectTrigger className="h-12 w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="KW">KW</SelectItem>
                        <SelectItem value="MW">MW</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total power capacity of the entire solar plant
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="voltagePerPanel">Voltage per Panel (V)</Label>
                    <Input
                      id="voltagePerPanel"
                      type="number"
                      step="0.1"
                      value={formData.voltagePerPanel}
                      onChange={(e) => setFormData({ ...formData, voltagePerPanel: e.target.value })}
                      placeholder="20"
                      required
                      className="h-12"
                    />
                    <p className="text-xs text-muted-foreground">Typical: 20V per panel</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currentPerPanel">Current per Panel (A)</Label>
                    <Input
                      id="currentPerPanel"
                      type="number"
                      step="0.1"
                      value={formData.currentPerPanel}
                      onChange={(e) => setFormData({ ...formData, currentPerPanel: e.target.value })}
                      placeholder="10"
                      required
                      className="h-12"
                    />
                    <p className="text-xs text-muted-foreground">Typical: 10A per panel</p>
                  </div>
                </div>

                <div className="bg-accent/20 p-3 rounded-lg">
                  <p className="text-sm font-semibold">Calculated Power per Panel:</p>
                  <p className="text-lg text-primary">
                    {parseFloat(formData.voltagePerPanel || '0') * parseFloat(formData.currentPerPanel || '0')}W
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Administrator Account</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="adminName">Admin Name</Label>
                  <Input
                    id="adminName"
                    value={formData.adminName}
                    onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                    placeholder="Enter Admin Name"
                    required
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adminEmail">Admin Email</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    value={formData.adminEmail}
                    onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                    placeholder="admin@company.com"
                    required
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adminPassword">Admin Password</Label>
                  <div className="relative">
                    <Input
                      id="adminPassword"
                      type={showPassword ? "text" : "password"}
                      value={formData.adminPassword}
                      onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                      placeholder="Create a secure password"
                      required
                      minLength={6}
                      className="h-12 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <button type="submit" className="custom-button">
                  <Save className="h-6 w-6" />
                  Create Company & Admin
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
};

export default AddCompany;
