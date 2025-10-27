import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff } from 'lucide-react';
import BackButton from '@/components/ui/BackButton';

const AuthTest = () => {
  const [email, setEmail] = useState('super_admin@microsyslogic.com');
  const [password, setPassword] = useState('super_admin_password');
  const [companyName, setCompanyName] = useState('microsyslogic');
  const [showPassword, setShowPassword] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testBackendConnection = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://solarplant.onrender.com/api/status');
      const data = await response.json();
      setResult({ type: 'backend', data });
    } catch (error) {
      setResult({ type: 'backend', error: error.message });
    }
    setLoading(false);
  };

  const testCompanies = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://solarplant.onrender.com/api/companies');
      const data = await response.json();
      setResult({ type: 'companies', data });
    } catch (error) {
      setResult({ type: 'companies', error: error.message });
    }
    setLoading(false);
  };

  const testLogin = async () => {
    setLoading(true);
    try {
      // Import the login function dynamically
      const { login } = await import('@/lib/auth');
      const result = await login(email, password, companyName);
      setResult({ type: 'login', data: result });
    } catch (error) {
      setResult({ type: 'login', error: error.message });
    }
    setLoading(false);
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
          width: 80%;
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
          scale: 1.1;
          box-shadow: 0 0px 20px rgba(193, 163, 98, 0.4);
        }

        .custom-button:active {
          scale: 1;
        }
      `}</style>
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="absolute top-4 left-4 z-10">
        <BackButton />
      </div>
      <div className="container max-w-2xl mx-auto py-8">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Authentication Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Company Name</label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value.toLowerCase())}
                  placeholder="microsyslogic"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="super_admin@microsyslogic.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="super_admin_password"
                    className="pr-12"
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
            </div>

            <div className="flex gap-2 justify-center">
              <button onClick={testBackendConnection} disabled={loading} className="custom-button">
                Test Backend
              </button>
              <button onClick={testCompanies} disabled={loading} className="custom-button">
                Test Companies
              </button>
              <button onClick={testLogin} disabled={loading} className="custom-button">
                Test Login
              </button>
            </div>

            {result && (
              <div className="mt-4 p-4 bg-accent/20 rounded-lg">
                <h3 className="font-semibold mb-2">Result ({result.type}):</h3>
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <h3 className="font-semibold mb-2">Test Credentials:</h3>
              <p><strong>Super Admin:</strong> super_admin@microsyslogic.com / super_admin_password</p>
              <p><strong>Intel Admin:</strong> karthik@gmail.com / admin123</p>
              <p><strong>Whipro Admin:</strong> harsha@gmail.com / admin123</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
};

export default AuthTest;
