import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, LogIn, Eye, EyeOff, Shield, User } from 'lucide-react';
import { login, getStoredCredentials, storeCredentials } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import logo from '@/images/logo.png';
import BackButton from '@/components/ui/BackButton';

const UnifiedLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    companyName: '',
    role: 'technician' as 'admin' | 'technician' | 'management',
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Load stored credentials on component mount
  useEffect(() => {
    console.log('🔐 UnifiedLogin: Loading stored credentials on mount...');
    const stored = getStoredCredentials();
    if (stored) {
      console.log('🔐 UnifiedLogin: Found stored credentials, auto-filling form');
      setFormData({
        email: stored.email,
        password: stored.password,
        companyName: '',
        role: 'technician',
      });
      setRememberMe(true);
    } else {
      console.log('🔐 UnifiedLogin: No stored credentials found');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const result = await login(formData.email, formData.password, formData.companyName, formData.role as 'admin' | 'technician');
      
      if (result.success && result.user) {
        // Store credentials if "Remember Me" is checked
        console.log('🔐 UnifiedLogin: Storing credentials with Remember Me:', rememberMe);
        storeCredentials(formData.email, formData.password, rememberMe);
        
        toast({
          title: 'Login Successful',
          description: `Welcome to ${result.user.companyName}!`,
        });
        
        // Navigate to appropriate dashboard based on user role
        setTimeout(() => {
          if (result.user.role === 'super_admin') {
            navigate('/super-admin-dashboard');
          } else if (result.user.role === 'plant_admin') {
            navigate('/plant-admin-dashboard');
          } else if (result.user.role === 'technician') {
            navigate('/technician-welcome');
          } else if (result.user.role === 'management') {
            navigate('/management-dashboard');
          }
        }, 100);
      } else {
        toast({
          title: 'Login Failed',
          description: result.error || 'Invalid credentials',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: 'Login Failed',
        description: 'An error occurred during login. Please try again.',
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
          width: 100%;
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
          scale: 1.05;
          box-shadow: 0 0px 20px rgba(193, 163, 98, 0.4);
        }

        .custom-button:active {
          scale: 1;
        }
      `}</style>
      <div className="login-container">
      <div className="absolute top-4 left-4 z-10">
        <BackButton />
      </div>
      <div className="w-full max-w-md">
        <Button
          onClick={() => navigate('/')}
          className="mb-6 btn-outline-modern"
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Back
        </Button>

        <div className="login-card">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-48 h-48 mb-6">
              <img 
                src={logo} 
                alt="Logo" 
                className="w-48 h-48 object-contain"
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  const fallback = target.nextElementSibling as HTMLElement;
                  target.style.display = 'none';
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              <div className="inline-flex items-center justify-center w-48 h-48 bg-gradient-to-br from-green-500 to-blue-600 rounded-3xl shadow-lg shadow-green-500/25" style={{display: 'none'}}>
                <LogIn className="w-24 h-24 text-white" />
              </div>
            </div>
            <p className="text-gray-600 text-base font-medium">Sign in with your credentials</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="role" className="text-base font-medium text-gray-700">Role</Label>
              <select
                id="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'technician' | 'management' })}
                className="h-14 text-base input-modern w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                <option value="admin">Admin</option>
                <option value="management">Management</option>
                <option value="technician">Technician</option>
              </select>
            </div>

            <div className="space-y-3">
              <Label htmlFor="companyName" className="text-base font-medium text-gray-700">Company Name</Label>
              <Input
                id="companyName"
                type="text"
                placeholder="Enter your company name"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value.toLowerCase() })}
                required
                className="h-14 text-base input-modern"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="email" className="text-base font-medium text-gray-700">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="h-14 text-base input-modern"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="password" className="text-base font-medium text-gray-700">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="h-14 text-base input-modern pr-12"
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

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="remember" 
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              />
              <Label htmlFor="remember" className="text-sm font-medium text-gray-700">
                Remember me
              </Label>
            </div>

            <div className="flex justify-center">
              <button
                type="submit"
                className="custom-button"
              >
                <LogIn className="h-6 w-6" />
                Login
              </button>
            </div>
          </form>

          <div className="mt-8 p-4 bg-green-50 rounded-lg border border-green-200">
            <h3 className="text-sm font-semibold text-green-800 mb-2">Demo Credentials:</h3>
            <div className="text-xs text-green-700 space-y-1">
              <div><strong>Plant Admin:</strong></div>
              <div>Company: google</div>
              <div>Email: rakesh@gmail.com</div>
              <div>Password: Rakesh@123</div>
              <div className="mt-2"><strong>Technician:</strong></div>
              <div>Company: google</div>
              <div>Email: trishul@gmail.com</div>
              <div>Password: DvepmZXb</div>
              <div className="mt-2"><strong>Super Admin:</strong></div>
              <div>Company: microsyslogic</div>
              <div>Email: super_admin@microsyslogic.com</div>
              <div>Password: super_admin_password</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default UnifiedLogin;

