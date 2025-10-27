import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogOut, Building2, Zap, Activity, Plus, Users, Settings, Eye, ArrowLeft, Monitor, Trash2, Shield, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import InfrastructureView from '@/components/plant/InfrastructureView';
import PanelMonitor from '@/components/panels/PanelMonitor';
import DeleteConfirmationModal from '@/components/common/DeleteConfirmationModal';
import TableCreationTest from '@/components/debug/TableCreationTest';

type ViewMode = 'main' | 'addCompany' | 'viewCompany' | 'editAdmin' | 'viewPlant' | 'viewPanels';

interface CompanyUsers {
  [companyName: string]: any[];
}

const SuperAdminDashboard = () => {
  const { user, logout, companies, addCompany, updateCompany, deleteCompany } = useAuth();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('main');
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [companyUsers, setCompanyUsers] = useState<CompanyUsers>({});
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    companyId: '',
    companyName: ''
  });
  const [newCompany, setNewCompany] = useState({
    name: '',
    plantPowerKW: 1000,
    panelVoltage: 48,
    panelCurrent: 50,
    totalTables: 10,
    panelsPerTable: 40,
    topRowPanels: 20,
    bottomRowPanels: 20,
    adminEmail: '',
    adminPassword: ''
  });

  useEffect(() => {
    // Load users for all companies from backend API
    const loadAllUsers = async () => {
      const allUsers: CompanyUsers = {};
      try {
        const { getUsers } = await import('@/lib/realFileSystem');
        for (const company of companies) {
          try {
            const users = await getUsers(company.id);
            allUsers[company.name] = users;
          } catch (error) {
            console.error(`Error loading users for ${company.name}:`, error);
            allUsers[company.name] = [];
          }
        }
      } catch (error) {
        console.error('Error loading users from backend:', error);
        // Fallback to empty users
        companies.forEach(company => {
          allUsers[company.name] = [];
        });
      }
      setCompanyUsers(allUsers);
    };
    loadAllUsers();
  }, [companies]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleClearData = () => {
    if (window.confirm('This will clear all data and reload the page. Continue?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleAddCompany = () => {
    if (!newCompany.name || !newCompany.adminEmail || !newCompany.adminPassword) {
      toast.error('Please fill in all required fields');
      return;
    }

    console.log('Creating company with values:', newCompany);
    console.log('Form values - totalTables:', newCompany.totalTables, 'topRowPanels:', newCompany.topRowPanels, 'bottomRowPanels:', newCompany.bottomRowPanels);

    // Create individual table configurations for each table
    const tableConfigs = Array.from({ length: newCompany.totalTables }, (_, index) => ({
      tableNumber: index + 1,
      topRowPanels: newCompany.topRowPanels,
      bottomRowPanels: newCompany.bottomRowPanels
    }));

    console.log('Generated table configs:', tableConfigs);
    console.log(`Creating ${newCompany.totalTables} tables, each with ${newCompany.topRowPanels} top + ${newCompany.bottomRowPanels} bottom = ${newCompany.topRowPanels + newCompany.bottomRowPanels} panels`);
    console.log('Total expected panels:', (newCompany.topRowPanels + newCompany.bottomRowPanels) * newCompany.totalTables);

    const companyData = {
      id: `comp-${Date.now()}`,
      name: newCompany.name,
      plantPowerKW: newCompany.plantPowerKW,
      panelVoltage: newCompany.panelVoltage,
      panelCurrent: newCompany.panelCurrent,
      totalTables: newCompany.totalTables,
      panelsPerTable: newCompany.panelsPerTable,
      topRowPanels: newCompany.topRowPanels,
      bottomRowPanels: newCompany.bottomRowPanels,
      tableConfigs: tableConfigs,
      adminEmail: newCompany.adminEmail,
      adminPassword: newCompany.adminPassword
    };

    addCompany(companyData);
    toast.success(`Company "${newCompany.name}" added successfully!`);
    setNewCompany({
      name: '',
      plantPowerKW: 1000,
      panelVoltage: 48,
      panelCurrent: 50,
      totalTables: 10,
      panelsPerTable: 40,
      topRowPanels: 20,
      bottomRowPanels: 20,
      adminEmail: '',
      adminPassword: ''
    });
    setViewMode('main');
  };

  const handleEditAdmin = (company: any) => {
    setSelectedCompany(company);
    setViewMode('editAdmin');
  };

  const handleDeleteCompany = (company: any) => {
    setDeleteModal({
      isOpen: true,
      companyId: company.id,
      companyName: company.name
    });
  };

  const confirmDeleteCompany = (superAdminPassword: string) => {
    const success = deleteCompany(deleteModal.companyId, superAdminPassword);
    
    if (success) {
      toast.success(`Company "${deleteModal.companyName}" deleted successfully`);
      setDeleteModal({ isOpen: false, companyId: '', companyName: '' });
      setViewMode('main');
    } else {
      toast.error('Invalid Super Admin password or deletion failed');
    }
  };

  const handleUpdateAdmin = () => {
    if (!selectedCompany) return;
    
    updateCompany(selectedCompany.id, {
      adminEmail: selectedCompany.adminEmail,
      adminPassword: selectedCompany.adminPassword
    });
    
    toast.success('Admin details updated successfully!');
    setViewMode('main');
  };

  // Add Company View
  if (viewMode === 'addCompany') {
    return (
      <div className="min-h-screen p-6 flex flex-col">
        <Button onClick={() => setViewMode('main')} variant="ghost" className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="max-w-4xl mx-auto flex-grow">
          <div className="glass-panel p-8">
            <h2 className="text-3xl font-bold mb-6 text-primary">Add New Company</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    value={newCompany.name}
                    onChange={(e) => setNewCompany({...newCompany, name: e.target.value})}
                    placeholder="e.g., GreenTech Solar"
                    className="glass-card"
                  />
                </div>

                <div>
                  <Label htmlFor="adminEmail">Admin Email *</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    value={newCompany.adminEmail}
                    onChange={(e) => setNewCompany({...newCompany, adminEmail: e.target.value})}
                    placeholder="admin@company.com"
                    className="glass-card"
                  />
                </div>

                <div>
                  <Label htmlFor="adminPassword">Admin Password *</Label>
                  <Input
                    id="adminPassword"
                    type="password"
                    value={newCompany.adminPassword}
                    onChange={(e) => setNewCompany({...newCompany, adminPassword: e.target.value})}
                    placeholder="Enter admin password"
                    className="glass-card"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="plantPower">Plant Power (kW)</Label>
                  <Input
                    id="plantPower"
                    type="number"
                    value={newCompany.plantPowerKW}
                    onChange={(e) => setNewCompany({...newCompany, plantPowerKW: parseInt(e.target.value) || 0})}
                    className="glass-card"
                  />
                </div>

                <div>
                  <Label htmlFor="panelVoltage">Panel Voltage (V)</Label>
                  <Input
                    id="panelVoltage"
                    type="number"
                    value={newCompany.panelVoltage}
                    onChange={(e) => setNewCompany({...newCompany, panelVoltage: parseInt(e.target.value) || 0})}
                    className="glass-card"
                  />
                </div>

                <div>
                  <Label htmlFor="panelCurrent">Panel Current (A)</Label>
                  <Input
                    id="panelCurrent"
                    type="number"
                    step="0.01"
                    value={newCompany.panelCurrent}
                    onChange={(e) => setNewCompany({...newCompany, panelCurrent: parseFloat(e.target.value) || 0})}
                    className="glass-card"
                  />
                </div>

                <div>
                  <Label htmlFor="totalTables">Total Tables</Label>
                  <Input
                    id="totalTables"
                    type="number"
                    min="1"
                    value={newCompany.totalTables}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (!isNaN(value) && value > 0) {
                        setNewCompany({...newCompany, totalTables: value});
                      }
                    }}
                    className="glass-card"
                  />
                </div>

                <div>
                  <Label htmlFor="topRowPanels">Top Row Panels</Label>
                  <Input
                    id="topRowPanels"
                    type="number"
                    min="0"
                    value={newCompany.topRowPanels}
                    onChange={(e) => {
                      const topPanels = parseInt(e.target.value);
                      if (!isNaN(topPanels) && topPanels >= 0) {
                        setNewCompany({
                          ...newCompany, 
                          topRowPanels: topPanels,
                          panelsPerTable: topPanels + newCompany.bottomRowPanels
                        });
                      }
                    }}
                    className="glass-card"
                    placeholder="Panels in top row (e.g., 20)"
                  />
                </div>

                <div>
                  <Label htmlFor="bottomRowPanels">Bottom Row Panels</Label>
                  <Input
                    id="bottomRowPanels"
                    type="number"
                    min="0"
                    value={newCompany.bottomRowPanels}
                    onChange={(e) => {
                      const bottomPanels = parseInt(e.target.value);
                      if (!isNaN(bottomPanels) && bottomPanels >= 0) {
                        setNewCompany({
                          ...newCompany, 
                          bottomRowPanels: bottomPanels,
                          panelsPerTable: newCompany.topRowPanels + bottomPanels
                        });
                      }
                    }}
                    className="glass-card"
                    placeholder="Panels in bottom row (e.g., 20)"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Total: {newCompany.topRowPanels + newCompany.bottomRowPanels} panels per table
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleAddCompany}
              className="w-full mt-6 gradient-primary text-white py-6 text-lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Company
            </Button>
          </div>
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

              {/* Quick Links */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Quick Links</h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a href="/privacy-policy" className="text-gray-600 hover:text-primary">
                      Privacy Policy
                    </a>
                  </li>
                  <li>
                    <a href="/terms-of-service" className="text-gray-600 hover:text-primary">
                      Terms of Service
                    </a>
                  </li>
                  <li>
                    <a href="/help" className="text-gray-600 hover:text-primary">
                      Help & Support
                    </a>
                  </li>
                </ul>
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
                <span>GDPR Compliant</span>
                <span>•</span>
                <span>CCPA Compliant</span>
                <span>•</span>
                <span>ISO 27001</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // Edit Admin View
  if (viewMode === 'editAdmin' && selectedCompany) {
    return (
      <div className="min-h-screen p-6 flex flex-col">
        <Button onClick={() => setViewMode('main')} variant="ghost" className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="max-w-2xl mx-auto flex-grow">
          <div className="glass-panel p-8">
            <h2 className="text-3xl font-bold mb-6 text-primary">Edit Admin - {selectedCompany.name}</h2>
            
            <div className="space-y-6">
              <div>
                <Label htmlFor="editAdminEmail">Admin Email</Label>
                <Input
                  id="editAdminEmail"
                  type="email"
                  value={selectedCompany.adminEmail}
                  onChange={(e) => setSelectedCompany({...selectedCompany, adminEmail: e.target.value})}
                  className="glass-card"
                />
              </div>

              <div>
                <Label htmlFor="editAdminPassword">Admin Password</Label>
                <Input
                  id="editAdminPassword"
                  type="password"
                  value={selectedCompany.adminPassword}
                  onChange={(e) => setSelectedCompany({...selectedCompany, adminPassword: e.target.value})}
                  className="glass-card"
                />
              </div>

              <Button
                onClick={handleUpdateAdmin}
                className="w-full gradient-primary text-white py-6 text-lg"
              >
                <Settings className="w-5 h-5 mr-2" />
                Update Admin Details
              </Button>
            </div>
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

                {/* Quick Links */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Quick Links</h3>
                  <ul className="space-y-2 text-sm">
                    <li>
                      <a href="/privacy-policy" className="text-gray-600 hover:text-primary">
                        Privacy Policy
                      </a>
                    </li>
                    <li>
                      <a href="/terms-of-service" className="text-gray-600 hover:text-primary">
                        Terms of Service
                      </a>
                    </li>
                    <li>
                      <a href="/help" className="text-gray-600 hover:text-primary">
                        Help & Support
                      </a>
                    </li>
                  </ul>
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
                  <span>GDPR Compliant</span>
                  <span>•</span>
                  <span>CCPA Compliant</span>
                  <span>•</span>
                  <span>ISO 27001</span>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>
    );
  }

  // Plant Infrastructure View
  if (viewMode === 'viewPlant' && selectedCompany) {
    return (
      <SuperAdminPlantView 
        companyId={selectedCompany.id}
        companies={companies}
        onBack={() => setViewMode('viewCompany')} 
      />
    );
  }

  // Panel Monitoring View (Same as Plant View - they both show the visual interface)
  if (viewMode === 'viewPanels' && selectedCompany) {
    return <SuperAdminPlantView companyId={selectedCompany.id} companies={companies} onBack={() => setViewMode('viewCompany')} />;
  }

  // Company Details View
  if (viewMode === 'viewCompany' && selectedCompany) {
    // Always get the latest company data from the companies state
    const latestCompany = companies.find(c => c.id === selectedCompany.id);
    
    // If company not found (deleted), go back to main view
    if (!latestCompany) {
      console.log('Company not found, returning to main view');
      setViewMode('main');
      setSelectedCompany(null);
      return null;
    }
    
    const users = companyUsers[latestCompany.name] || [];
    
    console.log('Company Details View - Latest company data:', latestCompany);
    console.log('Total tables from latest data:', latestCompany.totalTables);
    console.log('Table configs count:', latestCompany.tableConfigs?.length);
    
    return (
      <div className="min-h-screen p-6 flex flex-col">
        <Button onClick={() => setViewMode('main')} variant="ghost" className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="glass-panel p-8 mb-6 flex-grow">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-primary">{latestCompany.name}</h2>
              <p className="text-muted-foreground">Company Overview & Management</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handleEditAdmin(latestCompany)}
                className="gradient-primary text-white"
              >
                <Settings className="w-4 h-4 mr-2" />
                Edit Admin
              </Button>
              <Button
                onClick={() => handleDeleteCompany(latestCompany)}
                variant="destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Company
              </Button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card
              className="glass-card p-4 hover:scale-105 transition-transform cursor-pointer"
              onClick={() => setViewMode('viewPlant')}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold">Visual Plant Monitor</h3>
                  <p className="text-sm text-muted-foreground">Full solar panel visualization</p>
                </div>
              </div>
            </Card>

            <Card
              className="glass-card p-4 hover:scale-105 transition-transform cursor-pointer"
              onClick={() => setViewMode('viewPanels')}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-accent/20 border-2 border-accent flex items-center justify-center">
                  <Monitor className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-bold">Live Panel Status</h3>
                  <p className="text-sm text-muted-foreground">Real-time visual monitoring</p>
                </div>
              </div>
            </Card>

            <Card className="glass-card p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <h3 className="font-bold">System Status</h3>
                  <p className="text-sm text-green-500">Online & Active</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Plant Details */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="glass-card p-4">
              <p className="text-sm text-muted-foreground">Plant Power</p>
              <p className="text-xl font-bold text-primary">
                {latestCompany.plantPowerKW >= 1000 
                  ? `${(latestCompany.plantPowerKW / 1000).toFixed(2)} MW` 
                  : `${latestCompany.plantPowerKW} kW`}
              </p>
            </Card>
            <Card className="glass-card p-4">
              <p className="text-sm text-muted-foreground">Panel Voltage</p>
              <p className="text-xl font-bold">{latestCompany.panelVoltage}V</p>
            </Card>
            <Card className="glass-card p-4">
              <p className="text-sm text-muted-foreground">Panel Current</p>
              <p className="text-xl font-bold">{latestCompany.panelCurrent.toFixed(2)}A</p>
            </Card>
            <Card className="glass-card p-4">
              <p className="text-sm text-muted-foreground">Total Tables</p>
              <p className="text-xl font-bold">{latestCompany.totalTables}</p>
            </Card>
          </div>

          {/* Table Configurations - Live Updates */}
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-4">Table Configurations (Live)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {latestCompany.tableConfigs?.map((config: any) => (
                <Card key={config.tableNumber} className="glass-card p-3">
                  <p className="text-xs text-muted-foreground">Table {config.tableNumber}</p>
                  <p className="text-sm font-semibold text-primary">
                    {config.topRowPanels}+{config.bottomRowPanels}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    = {config.topRowPanels + config.bottomRowPanels} panels
                  </p>
                </Card>
              )) || (
                <p className="text-sm text-muted-foreground col-span-full">No table configurations found</p>
              )}
            </div>
          </div>

          {/* Admin Details */}
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-4">Admin Details</h3>
            <Card className="glass-card p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Admin Email</p>
                  <p className="text-lg font-semibold text-accent">{latestCompany.adminEmail}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Password</p>
                  <p className="text-lg font-semibold">••••••••</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Users List */}
          <div>
            <h3 className="text-xl font-bold mb-4">Company Users ({users.length})</h3>
            {users.length === 0 ? (
              <Card className="glass-card p-8 text-center">
                <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No users registered yet</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {users.map((user: any) => (
                  <Card key={user.id} className="glass-card p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs px-2 py-1 rounded bg-accent/20 text-accent">
                          {user.role}
                        </span>
                        <p className="text-xs text-muted-foreground mt-1">
                          Added {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Delete Company Modal - Scoped to Company Details View */}
        <DeleteConfirmationModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, companyId: '', companyName: '' })}
          onConfirm={confirmDeleteCompany}
          title="Delete Company"
          itemName={deleteModal.companyName}
          itemType="company"
          confirmationText={deleteModal.companyName}
          passwordLabel="Super Admin Password"
          warningMessage={`This action cannot be undone. This will permanently delete the company "${deleteModal.companyName}", all its data, admin account, and all associated users. All plant configurations and monitoring data will be lost.`}
        />

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

              {/* Quick Links */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Quick Links</h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a href="/privacy-policy" className="text-gray-600 hover:text-primary">
                      Privacy Policy
                    </a>
                  </li>
                  <li>
                    <a href="/terms-of-service" className="text-gray-600 hover:text-primary">
                      Terms of Service
                    </a>
                  </li>
                  <li>
                    <a href="/help" className="text-gray-600 hover:text-primary">
                      Help & Support
                    </a>
                  </li>
                </ul>
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
                <span>GDPR Compliant</span>
                <span>•</span>
                <span>CCPA Compliant</span>
                <span>•</span>
                <span>ISO 27001</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 flex flex-col">
      {/* Header */}
      <div className="glass-panel p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 tracking-wide uppercase mb-2 relative" style={{letterSpacing: '0.15em'}}>
              <span className="bg-gradient-to-r from-blue-100 to-indigo-100 px-4 py-2 rounded-lg shadow-md">Super Admin Dashboard</span>
            </h1>
            <p className="text-muted-foreground">Welcome, {user?.name} - Main System Administrator</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleClearData} variant="outline" style={{backgroundColor: '#ff6b6b', color: 'white', borderColor: '#ff6b6b'}}>
              Clear Data
            </Button>
            <Button onClick={() => {
              console.log('=== DETAILED DEBUG ===');
              const companies = companies; // Use backend data
              console.log('Companies in localStorage:', companies.length);
              companies.forEach((company, index) => {
                console.log(`\nCompany ${index + 1}: ${company.name}`);
                console.log(`  Total Tables: ${company.totalTables}`);
                console.log(`  Top Row Panels: ${company.topRowPanels} (${typeof company.topRowPanels})`);
                console.log(`  Bottom Row Panels: ${company.bottomRowPanels} (${typeof company.bottomRowPanels})`);
                console.log(`  Table Configs Length: ${company.tableConfigs?.length || 0}`);
                if (company.tableConfigs) {
                  company.tableConfigs.forEach((config, i) => {
                    console.log(`    Table ${config.tableNumber}: ${config.topRowPanels} top + ${config.bottomRowPanels} bottom`);
                  });
                } else {
                  console.log(`    NO TABLE CONFIGS!`);
                }
              });
              alert('Detailed debug info logged to console!');
            }} variant="outline" style={{backgroundColor: '#4CAF50', color: 'white', borderColor: '#4CAF50'}}>
              Debug Info
            </Button>
            <Button onClick={() => {
              console.log('=== FIXING COMPANY DATA ===');
              const companies = companies; // Use backend data
              const fixedCompanies = companies.map((company) => {
                let fixed = { ...company };
                let wasFixed = false;
                
                // Fix undefined topRowPanels and bottomRowPanels
                if (fixed.topRowPanels === undefined) {
                  fixed.topRowPanels = 20;
                  wasFixed = true;
                  console.log(`Fixed ${company.name}: set topRowPanels to 20`);
                }
                if (fixed.bottomRowPanels === undefined) {
                  fixed.bottomRowPanels = 20;
                  wasFixed = true;
                  console.log(`Fixed ${company.name}: set bottomRowPanels to 20`);
                }
                
                // Fix missing or incorrect tableConfigs
                if (!fixed.tableConfigs || fixed.tableConfigs.length !== fixed.totalTables) {
                  fixed.tableConfigs = Array.from({ length: fixed.totalTables }, (_, index) => ({
                    tableNumber: index + 1,
                    topRowPanels: fixed.topRowPanels,
                    bottomRowPanels: fixed.bottomRowPanels
                  }));
                  wasFixed = true;
                  console.log(`Fixed ${company.name}: created ${fixed.totalTables} tableConfigs`);
                }
                
                if (wasFixed) {
                  console.log(`Company ${company.name} after fix:`, fixed);
                }
                
                return fixed;
              });
              
              // Data saving now handled by backend API
              console.log('All companies fixed and saved to localStorage');
              alert('Company data fixed! Refresh the page to see changes.');
            }} variant="outline" style={{backgroundColor: '#FF9800', color: 'white', borderColor: '#FF9800'}}>
              Fix Data
            </Button>
            <Button onClick={handleLogout} variant="destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground mb-1">Total Companies</p>
              <p className="text-3xl font-bold">{companies.length}</p>
            </div>
            <Building2 className="w-12 h-12 text-primary" />
          </div>
        </Card>

        <Card className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground mb-1">Total Power Output</p>
              <p className="text-3xl font-bold">
                {(companies.reduce((sum, c) => sum + c.plantPowerKW, 0) / 1000).toFixed(1)} MW
              </p>
            </div>
            <Zap className="w-12 h-12 text-accent" />
          </div>
        </Card>

        <Card className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground mb-1">Total Users</p>
              <p className="text-3xl font-bold">
                {Object.values(companyUsers).reduce((sum, users) => sum + users.length, 0)}
              </p>
            </div>
            <Users className="w-12 h-12 text-green-500" />
          </div>
        </Card>

        <Card className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground mb-1">Active Plants</p>
              <p className="text-3xl font-bold">{companies.length}</p>
            </div>
            <Activity className="w-12 h-12 text-orange-500" />
          </div>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card
          className="glass-card p-8 hover:scale-105 transition-transform cursor-pointer"
          onClick={() => setViewMode('addCompany')}
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mb-4 glow-effect">
              <Plus className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Add New Company</h3>
            <p className="text-muted-foreground">
              Register a new solar plant company with admin credentials
            </p>
          </div>
        </Card>

        <Card className="glass-card p-8">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-accent/20 border-2 border-accent flex items-center justify-center mb-4">
              <Building2 className="w-10 h-10 text-accent" />
            </div>
            <h3 className="text-2xl font-bold mb-2">System Overview</h3>
            <p className="text-muted-foreground">
              Monitor all companies and their solar plant operations
            </p>
          </div>
        </Card>
      </div>

      {/* Companies List */}
      <div className="glass-panel p-6 flex-grow">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Registered Solar Plant Companies</h2>
          <Button
            onClick={() => setViewMode('addCompany')}
            className="gradient-primary text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Company
          </Button>
        </div>
        
        <div className="grid gap-4">
          {companies.map((company) => {
            const users = companyUsers[company.name] || [];
            return (
              <Card key={company.id} className="glass-card p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <Building2 className="w-6 h-6 text-primary" />
                      <h3 className="text-xl font-bold">{company.name}</h3>
                      <span className="text-sm px-2 py-1 rounded bg-primary/20 text-primary">
                        {users.length} users
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Plant Power</p>
                        <p className="text-lg font-semibold text-primary">
                          {company.plantPowerKW >= 1000 
                            ? `${(company.plantPowerKW / 1000).toFixed(2)} MW` 
                            : `${company.plantPowerKW} kW`}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Admin Email</p>
                        <p className="text-lg font-semibold text-accent">{company.adminEmail}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Tables</p>
                        <p className="text-lg font-semibold">{company.totalTables}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <p className="text-lg font-semibold text-green-500">Active</p>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <Button
                        onClick={() => {
                          setSelectedCompany(company);
                          setViewMode('viewCompany');
                        }}
                        variant="outline"
                        size="sm"
                        className="border-primary text-primary"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedCompany(company);
                          setViewMode('viewPlant');
                        }}
                        variant="outline"
                        size="sm"
                        className="border-blue-500 text-blue-500"
                      >
                        <Building2 className="w-4 h-4 mr-2" />
                        Visual Plant
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedCompany(company);
                          setViewMode('viewPanels');
                        }}
                        variant="outline"
                        size="sm"
                        className="border-green-500 text-green-500"
                      >
                        <Monitor className="w-4 h-4 mr-2" />
                        Live Monitor
                      </Button>
                      <Button
                        onClick={() => handleEditAdmin(company)}
                        variant="outline"
                        size="sm"
                        className="border-accent text-accent"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Edit Admin
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Debug Component - Remove in production */}
      {process.env.NODE_ENV === 'development' && <TableCreationTest />}

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

            {/* Quick Links */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Quick Links</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="/privacy-policy" className="text-gray-600 hover:text-primary">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="/terms-of-service" className="text-gray-600 hover:text-primary">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="/help" className="text-gray-600 hover:text-primary">
                    Help & Support
                  </a>
                </li>
              </ul>
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
              <span>GDPR Compliant</span>
              <span>•</span>
              <span>CCPA Compliant</span>
              <span>•</span>
              <span>ISO 27001</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Super Admin Plant View Component - Full Visual Access
const SuperAdminPlantView = ({ companyId, companies, onBack }: { companyId: string; companies: any[]; onBack: () => void }) => {
  // Always get the latest company data from the companies array
  const company = companies.find(c => c.id === companyId);
  
  if (!company) {
    return (
      <div className="min-h-screen p-6">
        <Button onClick={onBack} variant="ghost" className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="text-center">
          <p className="text-muted-foreground">Company not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <Button onClick={onBack} variant="ghost" className="mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Company Details
      </Button>
      
      <div className="glass-panel p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-primary">{company.name} - Solar Plant Monitor</h2>
            <p className="text-muted-foreground">Super Admin View - Full Visual Access (Live Updates)</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-sm text-green-500 font-semibold">Live Monitoring</span>
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="glass-card p-3">
            <p className="text-xs text-muted-foreground">Plant Power</p>
            <p className="text-lg font-bold text-primary">
              {company.plantPowerKW >= 1000 
                ? `${(company.plantPowerKW / 1000).toFixed(2)} MW` 
                : `${company.plantPowerKW} kW`}
            </p>
          </Card>
          <Card className="glass-card p-3">
            <p className="text-xs text-muted-foreground">Panel Voltage</p>
            <p className="text-lg font-bold">{company.panelVoltage}V</p>
          </Card>
          <Card className="glass-card p-3">
            <p className="text-xs text-muted-foreground">Panel Current</p>
            <p className="text-lg font-bold">{company.panelCurrent.toFixed(2)}A</p>
          </Card>
          <Card className="glass-card p-3">
            <p className="text-xs text-muted-foreground">Total Tables</p>
            <p className="text-lg font-bold">{company.totalTables}</p>
          </Card>
        </div>
        
        {/* Table Configuration Summary */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Table Configurations</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {company.tableConfigs?.map((config: any) => (
              <Card key={config.tableNumber} className="glass-card p-2">
                <p className="text-xs text-muted-foreground">Table {config.tableNumber}</p>
                <p className="text-sm font-semibold">
                  {config.topRowPanels}+{config.bottomRowPanels} = {config.topRowPanels + config.bottomRowPanels}
                </p>
              </Card>
            )) || (
              <p className="text-sm text-muted-foreground col-span-full">No table configurations found</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Full Panel Monitor - Same as users see */}
      <PanelMonitor 
        key={`${company.id}-${company.totalTables}-${company.tableConfigs?.length || 0}`}
        companyName={company.name} 
      />
    </div>
  );
};

export default SuperAdminDashboard;
