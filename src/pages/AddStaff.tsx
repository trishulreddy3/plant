import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, UserPlus, Copy, CheckCircle, Shield, Mail, Phone } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { addStaffEntry } from '@/lib/realFileSystem';
import { useToast } from '@/hooks/use-toast';
import BackButton from '@/components/ui/BackButton';

const AddStaff = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const user = getCurrentUser();
  const [formData, setFormData] = useState({
    companyName: '',
    name: '',
    role: 'technician' as 'management' | 'admin' | 'technician',
    email: '',
    phoneNumber: '',
  });
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Pre-load company name from current user
    if (user?.companyName) {
      setFormData(prev => ({ ...prev, companyName: user.companyName }));
    }
  }, [user]);

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🔍 AddStaff Debug - User:', user);
    console.log('🔍 AddStaff Debug - CompanyId:', user?.companyId);
    console.log('🔍 AddStaff Debug - CompanyName:', user?.companyName);
    
    if (!user) {
      toast({
        title: 'Error',
        description: 'User not authenticated',
        variant: 'destructive',
      });
      return;
    }
    
    // Get companyId from companies list if not in user object
    let companyId = user.companyId;
    if (!companyId && user.companyName) {
      const { getAllCompanies } = await import('@/lib/realFileSystem');
      const companies = await getAllCompanies();
      const company = companies.find(c => c.name === user.companyName);
      companyId = company?.id;
      console.log('🔍 AddStaff Debug - Found companyId from companies list:', companyId);
    }
    
    if (!companyId) {
      toast({
        title: 'Error',
        description: 'Unable to find company information',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.companyName || !formData.name || !formData.email || !formData.phoneNumber) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    const password = generatePassword();
    setGeneratedPassword(password);

    try {
      // Add staff entry to backend
      await addStaffEntry(
        companyId,
        formData.companyName,
        formData.name,
        formData.role,
        formData.email,
        formData.phoneNumber,
        password,
        user.email
      );

      toast({
        title: 'Success!',
        description: `Staff entry created for ${formData.email}`,
      });
    } catch (error) {
      console.error('Error adding staff entry:', error);
      toast({
        title: 'Error',
        description: 'Failed to create staff entry',
        variant: 'destructive',
      });
    }
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(generatedPassword);
    setCopied(true);
    toast({
      title: 'Copied!',
      description: 'Password copied to clipboard',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setFormData({
      companyName: user?.companyName || '',
      name: '',
      role: 'technician',
      email: '',
      phoneNumber: '',
    });
    setGeneratedPassword('');
    setCopied(false);
  };

  if (!user || user.role !== 'plant_admin') {
    navigate('/admin-login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="absolute top-4 left-4 z-10">
        <BackButton />
      </div>
      <div className="container max-w-2xl mx-auto py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/plant-admin-dashboard')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <UserPlus className="h-6 w-6 text-primary" />
              Add Staff Entry
            </CardTitle>
            <CardDescription>
              Create a new staff entry with auto-generated secure password
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!generatedPassword ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    name="companyName"
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="Enter company name"
                    autoComplete="organization"
                    required
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as 'management' | 'admin' | 'technician' })}
                    className="w-full h-12 px-3 py-2 rounded-md bg-background border border-input focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  >
                    <option value="management">Management</option>
                    <option value="admin">Admin</option>
                    <option value="technician">Technician</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Staff Name</Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter staff full name"
                    autoComplete="name"
                    required
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="staff@example.com"
                    autoComplete="email"
                    required
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    placeholder="+1 234 567 8900"
                    autoComplete="tel"
                    required
                    className="h-12"
                  />
                </div>

                <Button type="submit" className="w-full h-12 gradient-primary">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create Staff Entry
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <Alert className="bg-success/10 border-success/20">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <AlertDescription className="text-success font-semibold">
                    Staff entry created successfully!
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-mono">{formData.companyName}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Role</Label>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-mono capitalize">{formData.role}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Staff Name</Label>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-mono">{formData.name}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-mono">{formData.email}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-mono">{formData.phoneNumber}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Generated Password</Label>
                  <div className="flex gap-2">
                    <div className="flex-1 p-3 bg-muted rounded-lg">
                      <p className="font-mono font-bold text-lg">{generatedPassword}</p>
                    </div>
                    <Button
                      onClick={copyPassword}
                      variant="outline"
                      size="icon"
                      className="h-12 w-12"
                    >
                      {copied ? (
                        <CheckCircle className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <Alert>
                  <AlertDescription className="text-sm">
                    <strong>Important:</strong> Please save this password securely. 
                    Share it with the staff member through a secure channel. This password will not be shown again.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2">
                  <Button
                    onClick={handleReset}
                    className="flex-1 gradient-primary"
                  >
                    Add Another Staff Entry
                  </Button>
                  <Button
                    onClick={() => navigate('/existing-staff-members')}
                    variant="outline"
                    className="flex-1"
                  >
                    View All Staff Members
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
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
  );
};

export default AddStaff;
