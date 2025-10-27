import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Zap, Plus, Eye, Building2, Shield, Mail, Activity } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { getTablesByCompany } from '@/lib/data';
import { getCompanies } from '@/lib/auth';
import { PlantDetails } from '@/lib/realFileSystem';
import BackButton from '@/components/ui/BackButton';

const Infrastructure = () => {
  const navigate = useNavigate();
  const [user] = useState(getCurrentUser());
  const [company, setCompany] = useState<any>(null);
  const [tables, setTables] = useState<any[]>([]);
  const [plantDetails, setPlantDetails] = useState<PlantDetails | null>(null);
  const [powerUnit, setPowerUnit] = useState<'W' | 'kW' | 'MW'>('W');
  const [loading, setLoading] = useState(true);

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
      navigate('/admin-login');
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

  if (!user) return null;

  if (loading) {
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
              <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
              <p className="text-lg font-semibold mb-2">Loading Infrastructure Data...</p>
              <p className="text-sm text-muted-foreground">
                Please wait while we fetch the company information.
              </p>
            </CardContent>
          </Card>
        </main>

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
            </div>
          </div>
        </footer>
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
              <Button onClick={() => navigate('/admin-login')}>
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </main>

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
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="absolute top-4 left-4 z-10">
        <BackButton />
      </div>
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

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Plant Details */}
        <Card className="card-modern">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Plant Details
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
        <div className="grid md:grid-cols-2 gap-4">
          <Button
            onClick={() => navigate('/add-table')}
            className="h-16 text-base btn-primary-modern rounded-3xl px-6 w-fit mx-auto"
          >
            <Plus className="mr-2 h-5 w-5" />
            Add New Table
          </Button>

          <Button
            onClick={() => navigate('/plant-monitor')}
            className="h-16 text-base btn-secondary-modern rounded-3xl px-6 w-fit mx-auto"
          >
            <Eye className="mr-2 h-5 w-5" />
            View Tables & Panels
          </Button>
        </div>

        {/* All Tables Overview */}
        {tables.length > 0 && (
          <Card className="card-modern">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                All Tables Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100 border-b-2 border-gray-400">
                      <th className="text-left py-3 px-4 font-semibold text-gray-800 border-r border-gray-300">Table No</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-800 border-r border-gray-300">Top Row Panels</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-800 border-r border-gray-300">Bottom Row Panels</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-800 border-r border-gray-300">Voltage per Panel</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-800 border-r border-gray-300">Current per Panel</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-800 border-r border-gray-300">
                        <div className="flex items-center gap-2">
                          Max Power Generating
                          <Select value={powerUnit} onValueChange={(value: 'W' | 'kW' | 'MW') => setPowerUnit(value)}>
                            <SelectTrigger className="w-20 h-8">
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
                      <th className="text-left py-3 px-4 font-semibold text-gray-800">Total Panels</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tables.map((table) => {
                      const topPanelsCount = table.panelsTop || 0;
                      const bottomPanelsCount = table.panelsBottom || 0;
                      const totalPanels = topPanelsCount + bottomPanelsCount;
                      
                      // Get voltage and current from plant details
                      const voltagePerPanel = plantDetails?.voltagePerPanel || company?.voltagePerPanel || 20;
                      const currentPerPanel = plantDetails?.currentPerPanel || company?.currentPerPanel || 10;
                      const maxPowerPerPanel = voltagePerPanel * currentPerPanel;
                      const maxTotalPower = maxPowerPerPanel * totalPanels;
                      
                      return (
                        <tr key={table.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium text-primary border-r border-gray-200">{table.serialNumber}</td>
                          <td className="py-3 px-4 border-r border-gray-200">{topPanelsCount}</td>
                          <td className="py-3 px-4 border-r border-gray-200">{bottomPanelsCount}</td>
                          <td className="py-3 px-4 border-r border-gray-200">{voltagePerPanel}V</td>
                          <td className="py-3 px-4 border-r border-gray-200">{currentPerPanel}A</td>
                          <td className="py-3 px-4 font-semibold text-green-600 border-r border-gray-200">{convertPower(maxTotalPower)}</td>
                          <td className="py-3 px-4 font-medium">{totalPanels}</td>
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
          <Card className="card-modern">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                All Tables Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No tables found</p>
                <p className="text-sm">Create your first table to get started</p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

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
          <div className="border-t border-gray-200 mt-6 pt-4 text-center text-sm text-gray-500">
            © 2025 Microsyslogic. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Infrastructure;
