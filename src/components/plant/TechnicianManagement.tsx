import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, UserPlus, Users, Mail, Key, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import DeleteConfirmationModal from '@/components/common/DeleteConfirmationModal';

interface UserManagementProps {
  onBack: () => void;
  initialView?: 'list' | 'add';
}

interface UserData {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  companyName: string;
  createdAt: string;
}

const TechnicianManagement = ({ onBack, initialView = 'list' }: UserManagementProps) => {
  const { user, deleteUser } = useAuth();
  const [viewMode, setViewMode] = useState<'list' | 'add'>(initialView);
  const [users, setUsers] = useState<UserData[]>([]);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'technician'
  });
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    userEmail: '',
    userName: ''
  });

  useEffect(() => {
    loadUsers();
  }, [user?.companyName]);

  const loadUsers = async () => {
    try {
      const { getUsers } = await import('@/lib/realFileSystem');
      if (user?.companyId) {
        const backendUsers = await getUsers(user.companyId);
        setUsers(backendUsers);
      }
    } catch (error) {
      console.error('Error loading users from backend:', error);
      setUsers([]);
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleAddUser = () => {
    if (!newUser.name || !newUser.email) {
      toast.error('Please fill in all fields');
      return;
    }

    const autoPassword = generatePassword();
    const userData: UserData = {
      id: `user-${Date.now()}`,
      name: newUser.name,
      email: newUser.email,
      password: autoPassword,
      role: newUser.role,
      companyName: user?.companyName || '',
      createdAt: new Date().toISOString()
    };

    const updatedUsers = [...users, userData];
    setUsers(updatedUsers);
    // User saving now handled by backend API

    toast.success(
      <div>
        <p className="font-bold">User created successfully!</p>
        <p className="text-sm mt-1">Password: {autoPassword}</p>
        <p className="text-xs text-muted-foreground mt-1">Save this password securely</p>
      </div>,
      { duration: 10000 }
    );

    setNewUser({ name: '', email: '', role: 'user' });
    setViewMode('list');
  };

  const handleDeleteUser = (userData: UserData) => {
    setDeleteModal({
      isOpen: true,
      userEmail: userData.email,
      userName: userData.name
    });
  };

  const confirmDeleteUser = (adminPassword: string) => {
    if (!user?.companyName) {
      toast.error('Company information not found');
      return;
    }

    const success = deleteUser(user.companyName, deleteModal.userEmail, adminPassword);
    
    if (success) {
      toast.success(`User "${deleteModal.userName}" deleted successfully`);
      setDeleteModal({ isOpen: false, userEmail: '', userName: '' });
      loadUsers(); // Reload the users list
    } else {
      toast.error('Invalid admin password or deletion failed');
    }
  };

  if (viewMode === 'add') {
    return (
      <div className="min-h-screen p-6">
        <Button onClick={() => setViewMode('list')} variant="ghost" className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Users List
        </Button>

        <div className="max-w-2xl mx-auto">
          <div className="glass-panel p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold">Add New Staff</h2>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter user's full name"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="glass-card"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@company.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="glass-card"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full glass-card px-3 py-2 rounded-md bg-background border border-input"
                >
                  <option value="user">User</option>
                  <option value="operator">Operator</option>
                  <option value="technician">Technician</option>
                </select>
              </div>

              <div className="glass-card p-4 bg-accent/10 border-accent">
                <div className="flex items-start gap-3">
                  <Key className="w-5 h-5 text-accent mt-1" />
                  <div>
                    <p className="font-semibold text-accent mb-1">Auto-Generated Password</p>
                    <p className="text-sm text-muted-foreground">
                      A secure password will be automatically generated and displayed after user creation.
                      Make sure to save it securely.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleAddUser}
                className="w-full gradient-primary text-white py-6 text-lg"
              >
                <UserPlus className="w-5 h-5 mr-2" />
                Create User Account
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <Button onClick={onBack} variant="ghost" className="mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Button>

      <div className="glass-panel p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            <h2 className="text-3xl font-bold">User Management</h2>
          </div>
          <Button
            onClick={() => setViewMode('add')}
            className="gradient-primary text-white"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add New Staff
          </Button>
        </div>

        {users.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-xl text-muted-foreground mb-4">No users added yet</p>
            <Button
              onClick={() => setViewMode('add')}
              variant="outline"
              className="border-primary text-primary"
            >
              Add Your First User
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {users.map((userData) => (
              <Card key={userData.id} className="glass-card p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <Mail className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">{userData.name}</h3>
                      <p className="text-sm text-muted-foreground">{userData.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-1 rounded bg-accent/20 text-accent">
                          {userData.role}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Added {new Date(userData.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleDeleteUser(userData)}
                      variant="destructive"
                      size="sm"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete User
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete User Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, userEmail: '', userName: '' })}
        onConfirm={confirmDeleteUser}
        title="Delete User"
        itemName={deleteModal.userName}
        itemType="user"
        confirmationText={deleteModal.userEmail}
        passwordLabel="Plant Admin Password"
        warningMessage={`This action cannot be undone. This will permanently delete the user "${deleteModal.userName}" (${deleteModal.userEmail}) from your company. The user will lose access to all plant monitoring features.`}
      />
    </div>
  );
};

export default TechnicianManagement;
