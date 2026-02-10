import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, X, AlertTriangle } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { getAllCompanies, getStaffEntries } from '@/lib/realFileSystem';
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

const EditStaff = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user] = useState(getCurrentUser());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forceMode, setForceMode] = useState(false);

  const entry = location.state?.entry as StaffEntry | undefined;

  const [formData, setFormData] = useState({
    companyName: '',
    name: '',
    role: 'technician' as 'management' | 'admin' | 'technician',
    email: '',
    phoneNumber: '',
  });

  const [originalData, setOriginalData] = useState({
    companyName: '',
    name: '',
    role: 'technician' as 'management' | 'admin' | 'technician',
    email: '',
    phoneNumber: '',
  });

  useEffect(() => {
    if (!user || user.role !== 'plant_admin') {
      navigate('/login');
      return;
    }

    if (!entry) {
      setError('No staff entry selected for editing');
      return;
    }

    // Pre-load the form with existing data
    const initialData = {
      companyName: entry.companyName || user.companyName || '',
      name: entry.name || '',
      role: entry.role,
      email: entry.email || '',
      phoneNumber: entry.phoneNumber || '',
    };

    setFormData(initialData);
    setOriginalData(initialData);
  }, [user, navigate, entry]);

  // Check if data has changed
  const hasDataChanged = () => {
    return (
      formData.companyName !== originalData.companyName ||
      formData.name !== originalData.name ||
      formData.role !== originalData.role ||
      formData.email !== originalData.email ||
      formData.phoneNumber !== originalData.phoneNumber
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if data has changed
    if (!hasDataChanged()) {
      alert('Data is not changed, unable to save the changes');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Resolve companyId and entryId robustly
      const { getAllCompanies, updateStaffEntry, getApiBaseUrl } = await import('@/lib/realFileSystem');
      const companies = await getAllCompanies();
      const API_BASE_URL = getApiBaseUrl();
      let companyIdToUse = companies.find(c => (c.name || '').trim().toLowerCase() === (user.companyName || '').trim().toLowerCase())?.id as string | undefined;
      let entryIdToUse = entry.id;

      // If id is not an entry-* or companyId doesn't work, scan all companies to find the matching entry by email+role
      const candidates = companies.map(c => c.id).filter(Boolean) as string[];
      for (const cid of candidates) {
        try {
          const list = await getStaffEntries(cid);
          const match = Array.isArray(list) ? list.find((e: any) => e?.email === entry.email && e?.role === entry.role) : null;
          if (match?.id && String(match.id).startsWith('entry-')) {
            companyIdToUse = cid;
            entryIdToUse = match.id;
            break;
          }
        } catch (_) { /* skip */ }
      }

      if (!companyIdToUse) throw new Error('Company not found');

      try {
        await updateStaffEntry(companyIdToUse, entryIdToUse, formData, forceMode);
        alert('Staff entry updated successfully!');
        navigate('/existing-staff-members');
      } catch (err: any) {
        if (err.status === 409) {
          setError(err.message || 'The staff member is currently logged in.');
          setForceMode(true);
        } else {
          throw err;
        }
      }
    } catch (err) {
      console.error('Update Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update staff entry');
    } finally {
      setLoading(false);
    }
  };

  if (!user || !entry) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center">
        <Card className="glass-card max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-red-600 mb-4">
              {error || 'No staff entry selected'}
            </p>
            <Button onClick={() => navigate('/existing-staff-members')} className="w-full">
              Go Back
            </Button>
          </CardContent>
        </Card>
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
            onClick={() => navigate('/existing-staff-members')}
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Staff Members
          </Button>
          <h1 className="text-2xl font-bold text-primary">Edit Staff Entry</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Edit Staff Member</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className={`mb-4 p-4 ${forceMode ? 'bg-orange-100 border-orange-400 text-orange-900 border-2 animate-pulse' : 'bg-red-50 border-red-200 text-red-700'} border rounded-lg flex items-center gap-2`}>
                <AlertTriangle className={`h-5 w-5 ${forceMode ? 'text-orange-600' : 'text-red-500'}`} />
                <span className={forceMode ? 'font-black' : ''}>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  name="companyName"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  autoComplete="organization"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Staff Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  autoComplete="name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'management' | 'admin' | 'technician' })}
                  className="w-full px-3 py-2 rounded-md bg-background border border-input focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  <option value="management">Management</option>
                  <option value="admin">Admin</option>
                  <option value="technician">Technician</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  autoComplete="tel"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={loading || (!hasDataChanged() && !forceMode)}
                  className={`flex-1 transition-all duration-300 ${!hasDataChanged() && !forceMode ? 'bg-gray-400 cursor-not-allowed' : forceMode ? 'bg-orange-600 hover:bg-orange-700 scale-105 shadow-lg' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  <Save className={`mr-2 h-4 w-4 ${forceMode ? 'animate-bounce' : ''}`} />
                  {loading ? 'Processing...' : forceMode ? 'SAVE CHANGES FORCELY' : 'Save Changes'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/existing-staff-members')}
                  className="flex-1"
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default EditStaff;

