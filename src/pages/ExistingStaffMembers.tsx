import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Lock, Unlock, AlertCircle, Info, RefreshCw } from 'lucide-react';
import { ArrowLeft, Users, Shield, Edit, Trash2, X, Search, CheckCircle2, Plus, UserPlus } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { getAllCompanies, getApiBaseUrl, deleteStaffEntry, updateStaffStatus } from '@/lib/realFileSystem';
import BackButton from '@/components/ui/BackButton';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface StaffEntry {
  id: string;
  companyName: string;
  name: string;
  role: 'management' | 'admin' | 'technician';
  email: string;
  phoneNumber: string;
  createdAt: string;
  createdBy: string;
  status: 'active' | 'blocked' | 'offline';
  failedLoginAttempts: number;
  lastLogin: string | null;
}

const ExistingStaffMembers = ({ embedded = false, onAddStaff }: { embedded?: boolean; onAddStaff?: () => void }) => {
  const navigate = useNavigate();
  const [user] = useState(getCurrentUser());
  const [staffEntries, setStaffEntries] = useState<StaffEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<StaffEntry | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Status Modal State
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusSelectedEntry, setStatusSelectedEntry] = useState<StaffEntry | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    // Only enforce strict role check when not embedded. Allow 'plant_admin' or 'admin'.
    if (!embedded && user.role !== 'plant_admin' && user.role !== 'admin') {
      navigate('/login');
      return;
    }

    const loadStaffEntries = async () => {
      try {
        setLoading(true);
        // Resolve companyId: prefer user.companyId, fallback to search by name
        let resolvedCompanyId: string | undefined = (user as any)?.companyId;
        let resolvedCompany: any = null;
        if (!resolvedCompanyId) {
          const companies = await getAllCompanies();
          const targetName = String(user.companyName || '').trim().toLowerCase();
          resolvedCompany = companies.find(c => String(c.name || '').trim().toLowerCase() === targetName || String(c.id || '').trim().toLowerCase() === targetName);
          resolvedCompanyId = resolvedCompany?.id;
        }

        console.log('🔍 Loading staff entries for company:', user.companyName, 'companyId:', resolvedCompanyId);

        if (resolvedCompanyId) {
          // Fetch entries from the entries endpoint
          try {
            const { getStaffEntries } = await import('@/lib/realFileSystem');
            let entries = await getStaffEntries(resolvedCompanyId);
            console.log('🔍 Loaded entries:', entries);

            if (Array.isArray(entries)) {
              // Ensure ID and formatting
              entries = entries.map((e: any) => ({
                ...e,
                id: e.userId || e.id,
                companyName: e.companyName || user.companyName || '',
                status: e.status || 'offline',
              }));
              // Filter out the current user (Admin should not see themselves)
              entries = entries.filter((e: any) => e.email !== user.email);
              setStaffEntries(entries);
            }
          } catch (apiError: any) {
            console.error('Error loading entries:', apiError.message);
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
  }, [user, navigate, embedded]);

  const handleRowClick = (entry: StaffEntry) => {
    setSelectedEntry(entry);
  };

  const handleStatusClick = (e: React.MouseEvent, entry: StaffEntry) => {
    e.stopPropagation();
    if (entry.status === 'blocked') {
      setStatusSelectedEntry(entry);
      setStatusModalOpen(true);
    }
  };

  const handleUnblock = async () => {
    if (!statusSelectedEntry) return;

    try {
      setIsUpdatingStatus(true);
      const companyId = (user as any).companyId;
      if (!companyId) throw new Error("Company ID not found");

      await updateStaffStatus(companyId, statusSelectedEntry.id, 'active');

      // Update local state
      setStaffEntries(prev => prev.map(e =>
        e.id === statusSelectedEntry.id ? { ...e, status: 'active', failedLoginAttempts: 0 } : e
      ));

      setStatusModalOpen(false);
      setStatusSelectedEntry(null);

      // Alert or toast
      alert(`User ${statusSelectedEntry.email} has been unblocked.`);
    } catch (error: any) {
      console.error('Error unblocking user:', error);
      alert('Failed to unblock user. Please try again.');
    } finally {
      setIsUpdatingStatus(false);
    }
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
    }
  };

  const handleDeleteConfirm = async (password: string, force: boolean = false) => {
    if (!selectedEntry) return;
    setDeleteError('');
    setIsDeleting(true);

    try {
      // Resolve companyId
      let companyId = (user as any).companyId;
      if (!companyId) {
        const companies = await getAllCompanies();
        const targetName = (user.companyName || '').trim().toLowerCase();
        const company = companies.find(c => (c.name || '').trim().toLowerCase() === targetName);
        if (company) companyId = company.id;
      }
      if (!companyId) throw new Error('Company not found');

      // 1. Verify password
      const { verifySuperAdminPassword } = await import('@/lib/realFileSystem');
      const isValid = await verifySuperAdminPassword(password);
      if (!isValid) throw new Error('Invalid password');

      // 2. Call delete API via helper
      await deleteStaffEntry(companyId, selectedEntry.id, force);

      // Success
      setStaffEntries(prev => prev.filter(e => e.id !== selectedEntry.id));
      setSelectedEntry(null);
      setShowDeleteModal(false);
      alert('Staff entry deleted successfully!');
      setTimeout(() => window.location.reload(), 500);
    } catch (error: any) {
      console.error('Error deleting entry:', error);
      if (error.status === 409) {
        setDeleteError(error.message);
      } else {
        alert(error.message || 'Failed to delete staff entry.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
  };

  // Filter entries based on search query
  const filteredEntries = staffEntries.filter(entry => {
    const query = searchQuery.toLowerCase();
    return (
      entry.name.toLowerCase().includes(query) ||
      entry.email.toLowerCase().includes(query) ||
      (entry.phoneNumber && String(entry.phoneNumber).includes(query)) ||
      entry.role.toLowerCase().includes(query) ||
      entry.companyName.toLowerCase().includes(query) ||
      entry.status.toLowerCase().includes(query)
    );
  });

  if (!user) return null;

  return (
    <div className={embedded ? '' : "min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5"}>
      {!embedded && (
        <>
          <div className="absolute top-4 left-4 z-10 hidden sm:block">
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
        </>
      )}

      <main className="container mx-auto px-4 py-8">
        <Card className="glass-card mb-6 shadow-xl border-blue-100/50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-6 w-6 text-blue-600" />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700 font-bold">
                  Staff Management
                </span>
              </div>
              <Badge variant="secondary" className="text-md px-4 py-1.5 flex items-center gap-1.5 bg-blue-50 text-blue-700 border-blue-200">
                <span className="font-semibold">Registered Staff:</span>
                <span>{searchQuery ? `${filteredEntries.length}/${staffEntries.length}` : staffEntries.length}</span>
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative group">
                <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <Input
                  type="text"
                  placeholder="Search by name, email, role, or status..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 h-13 field-light-blue border-gray-200 focus:border-blue-300 focus:ring-4 focus:ring-blue-100/50 transition-all rounded-xl"
                />
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground font-medium">Fetching secure staff records...</p>
              </div>
            ) : filteredEntries.length > 0 ? (
              <>
                {/* Mobile View */}
                <div className="grid gap-3 md:hidden">
                  {filteredEntries.map((entry, index) => (
                    <div
                      key={entry.id || `staff-mobile-${index}`}
                      className={`rounded-xl border ${selectedEntry?.id === entry.id ? 'bg-blue-700 text-white border-blue-800 shadow-lg' : 'bg-white border-gray-200 shadow-sm'} p-4 transition-all`}
                      onClick={() => handleRowClick(entry)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className={`text-[10px] uppercase tracking-wider font-bold mb-1 ${selectedEntry?.id === entry.id ? 'text-blue-100' : 'text-blue-600'}`}>
                            {entry.companyName}
                          </div>
                          <div className="font-bold text-lg truncate mb-1">{entry.name}</div>
                          <div className="flex flex-wrap gap-2 mb-3">
                            <Badge variant="outline" className={selectedEntry?.id === entry.id ? 'bg-white/20 text-white border-white' : 'bg-blue-50 text-blue-700 border-blue-100'}>
                              {entry.role}
                            </Badge>
                            <Badge
                              className={
                                entry.status === 'active' ? 'bg-green-500 hover:bg-green-600' :
                                  entry.status === 'blocked' ? 'bg-red-500 hover:bg-red-600 animate-pulse' :
                                    'bg-gray-400'
                              }
                              onClick={(e) => handleStatusClick(e, entry)}
                            >
                              {entry.status === 'blocked' && <Lock className="w-3 h-3 mr-1" />}
                              {entry.status}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center text-xs opacity-90">
                              <Shield className="w-3 h-3 mr-1.5 shrink-0" />
                              <span className="truncate">{entry.email}</span>
                            </div>
                            <div className="flex items-center text-xs opacity-90">
                              <Shield className="w-3 h-3 mr-1.5 shrink-0" />
                              <span>{entry.phoneNumber || 'No phone'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 flex flex-col gap-2">
                          <Button size="icon" variant={selectedEntry?.id === entry.id ? 'secondary' : 'outline'} className="rounded-full w-9 h-9" onClick={(e) => { e.stopPropagation(); navigate('/edit-staff', { state: { entry } }); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="destructive" className="rounded-full w-9 h-9" onClick={(e) => { e.stopPropagation(); setSelectedEntry(entry); setShowDeleteModal(true); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto rounded-xl border border-blue-100 shadow-inner">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-blue-600 text-white">
                        <th className="text-left py-4 px-5 font-bold uppercase tracking-wider text-xs border-r border-blue-500/30">Company</th>
                        <th className="text-left py-4 px-5 font-bold uppercase tracking-wider text-xs border-r border-blue-500/30">Staff Name</th>
                        <th className="text-left py-4 px-5 font-bold uppercase tracking-wider text-xs border-r border-blue-500/30">Role</th>
                        <th className="text-left py-4 px-5 font-bold uppercase tracking-wider text-xs border-r border-blue-500/30">Email</th>
                        <th className="text-left py-4 px-5 font-bold uppercase tracking-wider text-xs border-r border-blue-500/30">Phone Number</th>
                        <th className="text-left py-4 px-5 font-bold uppercase tracking-wider text-xs border-r border-blue-500/30">Status</th>
                        <th className="text-left py-4 px-5 font-bold uppercase tracking-wider text-xs">Joined Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEntries.map((entry, index) => (
                        <tr
                          key={entry.id || `staff-desktop-${index}`}
                          onClick={() => handleRowClick(entry)}
                          className={`cursor-pointer transition-all border-b border-blue-50/50 ${selectedEntry?.id === entry.id
                            ? 'bg-blue-700 text-white border-l-[6px] border-l-blue-900 shadow-md transform scale-[1.002] z-10'
                            : index % 2 === 0
                              ? 'bg-white hover:bg-blue-50/40'
                              : 'bg-blue-50/20 hover:bg-blue-50/40'
                            }`}
                        >
                          <td className="py-4 px-5 font-bold text-sm border-r border-gray-100">{entry.companyName}</td>
                          <td className="py-4 px-5 font-semibold text-sm border-r border-gray-100">{entry.name}</td>
                          <td className="py-4 px-5 border-r border-gray-100">
                            <Badge
                              variant="outline"
                              className={
                                selectedEntry?.id === entry.id ? 'border-white text-white bg-white/20' :
                                  entry.role === 'management' ? 'border-emerald-600 text-emerald-700 bg-emerald-50' :
                                    entry.role === 'admin' ? 'border-violet-600 text-violet-700 bg-violet-50' :
                                      'border-blue-600 text-blue-700 bg-blue-50'
                              }
                            >
                              {entry.role.charAt(0).toUpperCase() + entry.role.slice(1)}
                            </Badge>
                          </td>
                          <td className="py-4 px-5 text-sm whitespace-nowrap border-r border-gray-100 font-mono tracking-tight">{entry.email}</td>
                          <td className="py-4 px-5 text-sm whitespace-nowrap border-r border-gray-100">{entry.phoneNumber || 'N/A'}</td>
                          <td className="py-4 px-5 border-r border-gray-100">
                            <div
                              onClick={(e) => handleStatusClick(e, entry)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-transform active:scale-95 ${entry.status === 'blocked'
                                ? 'bg-red-100 text-red-700 border border-red-200 cursor-pointer animate-pulse shadow-sm'
                                : entry.status === 'active'
                                  ? 'bg-green-100 text-green-700 border border-green-200'
                                  : 'bg-gray-100 text-gray-600 border border-gray-200'
                                }`}
                            >
                              {entry.status === 'blocked' ? (
                                <><Lock className="w-3 h-3" /> Blocked</>
                              ) : entry.status === 'active' ? (
                                <><CheckCircle2 className="w-3 h-3" /> Active</>
                              ) : (
                                <><Info className="w-3 h-3" /> Offline</>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-5 text-sm whitespace-nowrap opacity-80 italic">
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
              </>
            ) : searchQuery ? (
              <div className="text-center py-16 bg-blue-50/50 rounded-2xl border border-dashed border-blue-200">
                <Search className="h-14 w-14 mx-auto mb-4 text-blue-200" />
                <h3 className="text-lg font-bold text-blue-900 mb-2">No matching records</h3>
                <p className="text-blue-600 mb-6">We couldn't find any staff member matching "{searchQuery}"</p>
                <Button onClick={() => setSearchQuery('')} variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-100">
                  <X className="mr-2 h-4 w-4" /> Clear Search Filters
                </Button>
              </div>
            ) : (
              <div className="text-center py-16 bg-blue-50/30 rounded-2xl border border-dashed border-blue-200">
                <Users className="h-16 w-16 mx-auto mb-4 text-blue-300" />
                <h3 className="text-xl font-bold text-blue-900 mb-2">Staff Registry is Empty</h3>
                <p className="text-blue-600 mb-8 max-w-md mx-auto">Start building your team by adding technicians, management staff, or additional administrators.</p>
                <Button size="lg" className="gradient-primary px-8" onClick={() => {
                  if (embedded && onAddStaff) {
                    onAddStaff();
                  } else {
                    navigate('/add-staff');
                  }
                }}>
                  <Plus className="mr-2 h-5 w-5" /> Add Your First Staff Member
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Bar for Selected Entry - Static Position */}
        <Card className={`glass-card mb-6 transition-all duration-300 ${selectedEntry ? 'border-2 border-blue-600 shadow-lg shadow-blue-100' : 'opacity-60 grayscale-[0.5]'}`}>
          <CardContent className="pt-6">
            <div className={`${selectedEntry ? 'bg-blue-700 text-white' : 'bg-gray-50 border border-dashed border-gray-300'} p-5 rounded-xl flex flex-col md:flex-row items-center justify-between gap-6 transition-all`}>
              <div>
                <h3 className={`text-lg font-bold flex items-center gap-2 ${selectedEntry ? 'text-white' : 'text-gray-500'}`}>
                  {selectedEntry ? (
                    <>
                      <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm">
                        {selectedEntry.name.charAt(0)}
                      </div>
                      Selected: {selectedEntry.name}
                    </>
                  ) : (
                    <>
                      <Info className="h-5 w-5" />
                      No Staff Selected
                    </>
                  )}
                </h3>
                {selectedEntry && (
                  <p className="text-blue-100 text-sm mt-1 ml-10 opacity-90">
                    {selectedEntry.email} • <span className="capitalize font-medium">{selectedEntry.role}</span>
                  </p>
                )}
                {!selectedEntry && (
                  <p className="text-gray-400 text-sm mt-1 ml-7">Click a row in the table above to manage details</p>
                )}
              </div>

              <div className="flex flex-wrap gap-3 w-full md:w-auto">
                <Button
                  onClick={handleEdit}
                  disabled={!selectedEntry}
                  className={`flex-1 md:flex-none font-bold h-11 px-6 transition-all ${selectedEntry ? 'bg-white text-blue-700 hover:bg-blue-50 shadow-sm' : 'bg-gray-200 text-gray-400'}`}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Details
                </Button>
                <Button
                  onClick={handleDeleteClick}
                  disabled={!selectedEntry}
                  variant="destructive"
                  className={`flex-1 md:flex-none font-bold h-11 px-6 shadow-sm ${selectedEntry ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-200 text-gray-400 border-none'}`}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Entry
                </Button>
                {selectedEntry && (
                  <Button
                    onClick={handleDeselect}
                    variant="ghost"
                    className="flex-1 md:flex-none text-white hover:bg-white/10 h-11 px-6"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Deselect
                  </Button>
                )}
              </div>
            </div>

            {selectedEntry?.status === 'blocked' && (
              <div className="mt-4 bg-red-100 text-red-700 p-3 rounded-lg flex items-center justify-center gap-3 text-sm font-bold animate-pulse border border-red-200">
                <AlertTriangle className="h-5 w-5" />
                SECURITY ALERT: THIS USER IS CURRENTLY BLOCKED FROM SYSTEM ACCESS
              </div>
            )}
          </CardContent>
        </Card>

        {staffEntries.length > 0 && (
          <Button
            onClick={() => {
              if (embedded && onAddStaff) {
                onAddStaff();
              } else {
                navigate('/add-staff');
              }
            }}
            className="w-full h-13 gradient-primary text-lg font-bold shadow-lg shadow-blue-500/20 mb-8 rounded-xl"
          >
            <UserPlus className="mr-2 h-5 w-5" /> Add Another Staff Member
          </Button>
        )}
      </main>

      {/* Blocked Status Detail Modal */}
      <Dialog open={statusModalOpen} onOpenChange={setStatusModalOpen}>
        <DialogContent className="sm:max-w-md border-t-4 border-t-red-500 rounded-t-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <Lock className="w-5 h-5 text-red-600" />
              Security Lock Details
            </DialogTitle>
            <DialogDescription className="pt-2 text-gray-600">
              This staff member account has been automatically disabled by the security system.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-4">
            <div className="bg-red-50 p-4 rounded-xl border border-red-100">
              <h5 className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2">Block Reason</h5>
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                <p className="text-sm font-semibold text-red-900 leading-snug">
                  Blocked due to <strong>{statusSelectedEntry?.failedLoginAttempts || 3} consecutive failed login attempts</strong>.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Last login attempt:</span>
                <span className="font-mono text-gray-700">
                  {statusSelectedEntry?.lastLogin
                    ? new Date(statusSelectedEntry.lastLogin).toLocaleString()
                    : 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Account status:</span>
                <span className="font-bold text-red-600">LOCKED</span>
              </div>
            </div>
          </div>

          <DialogFooter className="sm:justify-start gap-2">
            <Button
              type="button"
              className="bg-green-600 hover:bg-green-700 text-white font-bold flex-1 h-11 shadow-md transition-all active:scale-95"
              onClick={handleUnblock}
              disabled={isUpdatingStatus}
            >
              {isUpdatingStatus ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Unlocking...
                </>
              ) : (
                <>
                  <Unlock className="mr-2 h-4 w-4" />
                  Unblock Access
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-11 border-gray-200"
              onClick={() => setStatusModalOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationDialog
        isOpen={showDeleteModal}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Staff Member"
        description={`You are about to permanently delete the staff member "${selectedEntry?.name}". This action will remove their login credentials and access to the system.`}
        entityName={selectedEntry?.name || ''}
        entityType="user"
        adminEmail={user?.email || ''}
        isLoading={isDeleting}
        error={deleteError}
        onClearError={() => setDeleteError('')}
      />
    </div>
  );
};

export default ExistingStaffMembers;
