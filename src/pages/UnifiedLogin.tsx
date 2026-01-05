import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, LogIn, Eye, EyeOff, Shield, User } from 'lucide-react';
import { login, getStoredCredentials, storeCredentials } from '@/lib/auth';
import { getAllCompanies } from '@/lib/realFileSystem';
import { useToast } from '@/hooks/use-toast';
import logo from '@/images/logo.png';
import BackButton from '@/components/ui/BackButton';
import GradientHeading from '@/components/ui/GradientHeading';

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
  const [serverReady, setServerReady] = useState(false);
  const [checkingServer, setCheckingServer] = useState(true);

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

    // Listen for forced logout event
    const handleForcedLogout = () => {
      toast({
        title: 'Access Revoked',
        description: 'Your company configuration has changed or was removed. Please contact your administrator.',
        variant: 'destructive',
        duration: 10000,
      });
    };

    window.addEventListener('company-deleted-logout', handleForcedLogout);
    return () => window.removeEventListener('company-deleted-logout', handleForcedLogout);
  }, [toast]);

  // Automatic server connectivity checks with exponential backoff
  useEffect(() => {
    let mounted = true;
    let delay = 1500;
    const minDelay = 1500;
    const maxDelay = 20000;
    let timer: number | undefined;

    const loop = async () => {
      if (!mounted) return;
      try {
        await getAllCompanies();
        if (!mounted) return;
        setServerReady(true);
        setCheckingServer(false);
      } catch (_) {
        if (!mounted) return;
        setServerReady(false);
        setCheckingServer(true);
        delay = Math.min(delay * 2, maxDelay);
        timer = window.setTimeout(loop, delay);
      }
    };
    // kick off immediately
    loop();

    return () => {
      mounted = false;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverReady) {
      toast({ title: 'Connecting to server...', description: 'Please wait until the server is online.', variant: 'default' });
      return;
    }

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
        if (result.user.role === 'super_admin' || (result.user.role === 'admin' && result.user.companyName === 'microsyslogic')) {
          navigate('/super-admin-dashboard', { replace: true });
        } else if (result.user.role === 'plant_admin' || result.user.role === 'admin') {
          navigate('/plant-admin-dashboard', { replace: true });
        } else if (result.user.role === 'technician') {
          navigate('/technician-dashboard', { replace: true });
        } else if (result.user.role === 'management') {
          navigate('/management-dashboard', { replace: true });
        }
      } else {
        // Handle specific error cases from backend response
        let errorMsg = result.error || 'Invalid credentials';

        // Improve wording for mismatched credentials
        if (errorMsg.toLowerCase().includes('password') || errorMsg.toLowerCase().includes('user not found')) {
          errorMsg = 'Invalid credentials. Please check your email, company, and password.';
        }

        toast({
          title: 'Login Failed',
          description: errorMsg,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Login error:', error);

      let errorTitle = 'Login Failed';
      let errorDescription = 'An unexpected error occurred.';

      // Check if it's a network/server error
      if (error.message && (error.message.includes('Network Error') || error.message.includes('fetch') || error.message.includes('connect'))) {
        errorTitle = 'Server Connection Error';
        errorDescription = 'There is an error with the server. Please check your internet connection and try again later.';
      } else {
        // Unknown or internal errors
        errorDescription = error.message || 'An internal error occurred during login. Please contact support.';
      }

      toast({
        title: errorTitle,
        description: errorDescription,
        variant: 'destructive',
      });
    }
  };

  return (
    <div>
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
      {(!serverReady || checkingServer) && (
        <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-primary">Connecting to server...</h2>
            <p className="text-muted-foreground">Please wait while we establish a connection</p>
          </div>
        </div>
      )}
      {(serverReady && !checkingServer) && (
        <div className="login-container">
          <div className="absolute top-4 left-4 z-10 hidden sm:block">
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
                <div className="inline-flex items-center justify-center w-48 h-48 sm:w-72 sm:h-72 mb-6">
                  <img
                    src={logo}
                    alt="Logo"
                    className="w-48 h-48 sm:w-72 sm:h-72 object-contain"
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      const fallback = target.nextElementSibling as HTMLElement;
                      target.style.display = 'none';
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                  <div className="inline-flex items-center justify-center w-72 h-72 bg-gradient-to-br from-green-500 to-blue-600 rounded-3xl shadow-lg shadow-green-500/25" style={{ display: 'none' }}>
                    <LogIn className="w-24 h-24 text-white" />
                  </div>
                </div>
                <GradientHeading size="lg" className="mb-2">Solar Panel SCADA Solutions</GradientHeading>
                <p className="text-gray-600 text-base font-medium">Sign in with your credentials</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
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

                <div className="space-y-3">
                  <Label htmlFor="role" className="text-base font-medium text-gray-700">Role</Label>
                  <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v as 'admin' | 'technician' | 'management' })}>
                    <SelectTrigger id="role" className="h-14 text-base input-modern">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="management">Management</SelectItem>
                      <SelectItem value="technician">Technician</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2 justify-center">
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
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className="mt-3 text-sm text-gray-500 hover:text-blue-600 transition-colors font-medium"
                  >
                    Forgot Password?
                  </button>
                </div>
              </form>

              <div className="mt-8 p-4 bg-green-50 rounded-lg border border-green-200">
                <h3 className="text-sm sm:text-base font-semibold text-green-800 mb-2">Demo Credentials:</h3>
                <div className="text-xs sm:text-sm text-green-700 space-y-1 break-words">
                  <div><strong>Super Admin (role: admin):</strong></div>
                  <div>Company: microsyslogic</div>
                  <div>Email: superadmin@gmail.com</div>
                  <div>Password: superadmin@123</div>

                  <div className="mt-2"><strong>Plant Admin (role: admin):</strong></div>
                  <div>Company: infosys</div>
                  <div>Email: infosysadmin@gmail.com</div>
                  <div>Password: admin@123</div>

                  <div className="mt-2"><strong>Technician (role: technician):</strong></div>
                  <div>Company: infosys</div>
                  <div>Email: trishulreddy@gmail.com</div>
                  <div>Password: FW1k1lFdjw5j</div>
                  <div>hi</div>

                
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedLogin;

