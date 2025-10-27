import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AlertTriangle } from 'lucide-react';
import { ArrowLeft, Users, Shield, Edit, Trash2, X, Search } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { getAllCompanies } from '@/lib/realFileSystem';
import BackButton from '@/components/ui/BackButton';

interface StaffEntry {
  id: string;
  companyName: string;
  name: string;
  role: 'management' | 'admin' | 'technician';
  email: string;
  phoneNumber: string;
  createdAt: string;
  createdBy: string;
}

const ExistingStaffMembers = () => {
  const navigate = useNavigate();
  const [user] = useState(getCurrentUser());
  const [staffEntries, setStaffEntries] = useState<StaffEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<StaffEntry | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'plant_admin') {
      navigate('/admin-login');
      return;
    }

    const loadStaffEntries = async () => {
      try {
        // Get all companies to find the companyId
        const companies = await getAllCompanies();
        const company = companies.find(c => c.name === user.companyName);
        
        console.log('🔍 Loading staff entries for company:', user.companyName);
        console.log('🔍 Found company:', company);
        
        if (company && company.id) {
          // Fetch entries from the entries endpoint
          const API_BASE_URL = 'http://localhost:5000/api';
          const response = await fetch(`${API_BASE_URL}/companies/${company.id}/entries`);
          console.log('🔍 API Response:', response.status, response.statusText);
          
          if (response.ok) {
            const entries = await response.json();
            console.log('🔍 Loaded entries:', entries);
            setStaffEntries(entries);
          } else {
            console.error('Error loading entries:', response.statusText);
            setStaffEntries([]);
          }
        } else {
          console.error('Company not found or missing ID');
          setStaffEntries([]);
        }
      } catch (error) {
        console.error('Error loading staff entries:', error);
        setStaffEntries([]);
      } finally {
        setLoading(false);
      }
    };

    loadStaffEntries();
  }, [user, navigate]);

  const handleRowClick = (entry: StaffEntry) => {
    setSelectedEntry(entry);
  };

  const handleDeselect = () => {
    setSelectedEntry(null);
  };

  const handleEdit = () => {
    if (selectedEntry) {
      // Navigate to edit page with entry data
      navigate('/edit-staff', { state: { entry: selectedEntry } });
    }
  };

  const handleDeleteClick = () => {
    if (selectedEntry) {
      setShowDeleteModal(true);
      setDeleteConfirmation('');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedEntry) return;
    
    // Check if confirmation name matches
    if (deleteConfirmation !== selectedEntry.name) {
      alert('Confirmation name does not match. Please type the exact name.');
      return;
    }

    try {
      // Get companyId
      const companies = await getAllCompanies();
      const company = companies.find(c => c.name === user.companyName);
      
      if (!company || !company.id) {
        throw new Error('Company not found');
      }

      // Call delete API
      const API_BASE_URL = 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE_URL}/companies/${company.id}/entries/${selectedEntry.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove from local state
        setStaffEntries(staffEntries.filter(e => e.id !== selectedEntry.id));
        setSelectedEntry(null);
        setShowDeleteModal(false);
        setDeleteConfirmation('');
        alert('Staff entry deleted successfully!');
      } else {
        throw new Error('Failed to delete entry');
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert('Failed to delete staff entry. Please try again.');
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setDeleteConfirmation('');
  };

  // Filter entries based on search query
  const filteredEntries = staffEntries.filter(entry => {
    const query = searchQuery.toLowerCase();
    return (
      entry.name.toLowerCase().includes(query) ||
      entry.email.toLowerCase().includes(query) ||
      entry.phoneNumber.includes(query) ||
      entry.role.toLowerCase().includes(query) ||
      entry.companyName.toLowerCase().includes(query)
    );
  });

  if (!user) return null;

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
          <h1 className="text-2xl font-bold text-primary">Existing Staff Members</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="glass-card mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Staff Members
              </div>
              <Badge variant="secondary" className="text-lg px-4 py-1">
                {searchQuery ? `${filteredEntries.length}/${staffEntries.length}` : staffEntries.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Search Bar */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by name, email, phone, role, or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12"
                />
                        </div>
                      </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading staff members...</p>
              </div>
            ) : filteredEntries.length > 0 ? (
              <div className="overflow-x-auto">
                <div className="border border-gray-200 rounded-lg max-h-[350px] overflow-y-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-gray-100 border-b-2 border-gray-400">
                        <th className="text-left py-3 px-4 font-semibold text-gray-800 border-r border-gray-300 bg-gray-100">Company Name</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-800 border-r border-gray-300 bg-gray-100">Staff Name</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-800 border-r border-gray-300 bg-gray-100">Role</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-800 border-r border-gray-300 bg-gray-100">Email</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-800 border-r border-gray-300 bg-gray-100">Phone Number</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-800 bg-gray-100">Joined Date</th>
                      </tr>
                    </thead>
                  <tbody>
                    {filteredEntries.map((entry, index) => (
                      <tr 
                        key={entry.id}
                        onClick={() => handleRowClick(entry)}
                        className={`cursor-pointer transition-all border-b border-gray-200 ${
                          selectedEntry?.id === entry.id 
                            ? 'bg-blue-700 text-white border-l-4 border-l-blue-900 shadow-lg' 
                            : index % 2 === 0 
                              ? 'bg-blue-50 hover:bg-blue-100' 
                              : 'bg-blue-200 hover:bg-blue-300'
                        }`}
                      >
                        <td className={`py-3 px-4 font-medium border-r border-gray-200 ${selectedEntry?.id === entry.id ? 'text-white' : 'text-gray-900'}`}>{entry.companyName}</td>
                        <td className={`py-3 px-4 border-r border-gray-200 ${selectedEntry?.id === entry.id ? 'text-white' : 'text-gray-700'}`}>{entry.name}</td>
                        <td className="py-3 px-4 border-r border-gray-200">
                          <Badge 
                            variant="outline" 
                            className={
                              selectedEntry?.id === entry.id ? 'border-white text-white bg-white/20' :
                              entry.role === 'management' ? 'border-green-600 text-green-700 bg-green-50' :
                              entry.role === 'admin' ? 'border-purple-600 text-purple-700 bg-purple-50' :
                              'border-blue-600 text-blue-700 bg-blue-50'
                            }
                          >
                            {entry.role.charAt(0).toUpperCase() + entry.role.slice(1)}
                          </Badge>
                        </td>
                        <td className={`py-3 px-4 whitespace-nowrap border-r border-gray-200 ${selectedEntry?.id === entry.id ? 'text-white' : 'text-gray-700'}`}>{entry.email}</td>
                        <td className={`py-3 px-4 whitespace-nowrap border-r border-gray-200 ${selectedEntry?.id === entry.id ? 'text-white' : 'text-gray-700'}`}>{entry.phoneNumber}</td>
                        <td className={`py-3 px-4 whitespace-nowrap ${selectedEntry?.id === entry.id ? 'text-white' : 'text-gray-600'}`}>
                          {new Date(entry.createdAt).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  </table>
                </div>
              </div>
            ) : searchQuery ? (
              <div className="text-center py-12">
                <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">No staff members found matching "{searchQuery}"</p>
                <Button onClick={() => setSearchQuery('')} variant="outline">
                  Clear Search
                        </Button>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">No staff members registered yet</p>
                <Button onClick={() => navigate('/add-staff')}>
                  Add First Staff Member
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selected Entry Container - Always Visible */}
        <Card className={`glass-card mb-6 ${selectedEntry ? 'border-2 border-blue-700' : 'border-2 border-gray-200 opacity-60'}`}>
          <CardContent className="pt-6">
            <div className={`${selectedEntry ? 'bg-blue-700 text-white' : 'bg-gray-50'} p-4 rounded-lg mb-4 flex items-center justify-between`}>
              <div>
                <p className={`text-lg font-semibold ${selectedEntry ? 'text-white' : 'text-gray-500'}`}>
                  Selected: <span className={selectedEntry ? 'text-white' : 'text-gray-400'}>
                    {selectedEntry ? selectedEntry.name : 'No entry selected'}
                  </span>
                </p>
                {selectedEntry && (
                  <p className="text-sm text-white/90">{selectedEntry.email} • {selectedEntry.role.charAt(0).toUpperCase() + selectedEntry.role.slice(1)}</p>
                )}
              </div>
              
              <div className="flex gap-3">
                <Button
                  onClick={handleEdit}
                  disabled={!selectedEntry}
                  className={`flex-1 ${selectedEntry ? 'gradient-primary' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  onClick={handleDeleteClick}
                  disabled={!selectedEntry}
                  variant="destructive"
                  className={`flex-1 ${selectedEntry ? '' : 'opacity-50 cursor-not-allowed'}`}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
                <Button
                  onClick={handleDeselect}
                  disabled={!selectedEntry}
                  variant="outline"
                  className={`flex-1 ${selectedEntry ? 'bg-white text-blue-700 border-white hover:bg-gray-100' : 'opacity-50 cursor-not-allowed'}`}
                >
                  <X className="mr-2 h-4 w-4" />
                  Deselect
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {staffEntries.length > 0 && (
          <Button
            onClick={() => navigate('/add-staff')}
            className="w-full h-12 gradient-primary"
          >
            Add Another Staff Member
          </Button>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="glass-card max-w-md w-full mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-6 w-6" />
                CONFIRM PERMANENT DELETION
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-gray-700 mb-2">
                  You're about to permanently delete selected staff entries from the Solar Panel Analysis system. 
                  This action is irreversible and will remove all associated credentials, access permissions, 
                  and historical activity logs.
                </p>
                <p className="text-sm font-semibold text-gray-900 mt-3 mb-2">
                  To confirm, please type the name of the entries exactly as shown below:
                </p>
                <div className="bg-gray-100 border border-gray-300 rounded p-2 mb-2">
                  <p className="font-mono font-semibold text-lg text-gray-900">{selectedEntry.name}</p>
                </div>
                <p className="text-xs text-gray-600 italic">
                  Once deleted, this staff entry cannot be recovered. Please ensure you have reviewed all 
                  dependencies and access logs before proceeding.
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmName" className="text-sm font-semibold text-gray-700">
                  Type the entry name to confirm:
                </label>
                <Input
                  id="confirmName"
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="Enter the exact name"
                  className="h-12"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleDeleteConfirm}
                  disabled={deleteConfirmation !== selectedEntry.name}
                  variant="destructive"
                  className="flex-1 h-12"
                >
                  DELETE ENTRY
                </Button>
                <Button
                  onClick={handleDeleteCancel}
                  variant="outline"
                  className="flex-1 h-12"
                >
                  CANCEL
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
                  <Users className="h-4 w-4 mr-2" />
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

export default ExistingStaffMembers;
