import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Building2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface AdminLoginProps {
  onBack: () => void;
}

const AdminLogin = ({ onBack }: AdminLoginProps) => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    loginId: '',
    password: '',
    companyName: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const success = await login(formData.loginId, formData.password, formData.companyName.toLowerCase());
    
    if (success) {
      toast.success('Login successful!');
      navigate('/dashboard');
    } else {
      toast.error('Invalid credentials or company name. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Button
          onClick={onBack}
          variant="ghost"
          className="mb-6 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="glass-panel p-8 animate-scale-in">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center glow-effect">
              <Building2 className="w-8 h-8 text-white" />
            </div>
          </div>
          
          <h2 className="text-3xl font-bold text-center mb-2">Admin Login</h2>
          <p className="text-muted-foreground text-center mb-8">
            Enter your credentials to access the admin panel
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                type="text"
                placeholder="Enter your company name"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                required
                className="glass-card"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="loginId">Login ID (Email)</Label>
              <Input
                id="loginId"
                type="email"
                placeholder="admin@company.com"
                value={formData.loginId}
                onChange={(e) => setFormData({ ...formData, loginId: e.target.value })}
                required
                className="glass-card"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="glass-card"
              />
            </div>

            <Button
              type="submit"
              className="w-full gradient-primary text-white font-semibold py-6 text-lg hover:opacity-90"
            >
              Login
            </Button>

            <div className="text-center">
              <button
                type="button"
                className="text-sm text-primary hover:underline"
                onClick={() => toast.info('Please contact your administrator')}
              >
                Forgot Password?
              </button>
            </div>
          </form>
        </div>

        <div className="mt-6 glass-card p-4">
          <p className="text-sm text-muted-foreground text-center">
            <strong>Demo Credentials:</strong><br />
            Super Admin: Company: pm / Email: admin@pm.com / Password: superadmin123<br />
            Plant Admin: Company: solartech solutions / Email: admin@solartech.com / Password: admin123<br />
            Plant Admin: Company: greenenergy corp / Email: admin@greenenergy.com / Password: admin123
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
