import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, Sun, User } from 'lucide-react';
import { getCurrentUser, isLoggedIn } from '@/lib/auth';
import logo from '@/images/logo.png';
import BackButton from '@/components/ui/BackButton';

const Welcome = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    if (isLoggedIn()) {
      const user = getCurrentUser();
      if (user) {
        // Redirect based on user role
        switch (user.role) {
          case 'super_admin':
            navigate('/super-admin-dashboard');
            break;
          case 'plant_admin':
            navigate('/plant-admin-dashboard');
            break;
          case 'technician':
            navigate('/technician-welcome');
            break;
        }
      }
    }
  }, [navigate]);

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

        .custom-button-secondary {
          color: rgb(100, 150, 200);
          border-color: rgb(100, 150, 200);
        }

        .custom-button-secondary::before {
          background-color: rgb(100, 150, 200);
        }

        .custom-button-secondary:hover {
          box-shadow: 0 0px 20px rgba(100, 150, 200, 0.4);
        }
      `}</style>
      <div className="login-container">
      <div className="absolute top-4 left-4 z-10">
        <BackButton />
      </div>
      <div className="w-full max-w-md">
        <div className="login-card">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-48 h-48 mb-6">
              <img 
                src={logo} 
                alt="Logo" 
                className="w-48 h-48 object-contain"
                onError={(e) => {
                  // Fallback to Sun icon if logo fails to load
                  const target = e.currentTarget as HTMLImageElement;
                  const fallback = target.nextElementSibling as HTMLElement;
                  target.style.display = 'none';
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              <div className="inline-flex items-center justify-center w-48 h-48 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl shadow-lg shadow-blue-500/25" style={{display: 'none'}}>
                <Sun className="w-24 h-24 text-white" />
              </div>
            </div>
            <p className="text-gray-600 text-base font-medium">Solar Plant Monitor</p>
          </div>

          <div className="space-y-4 flex flex-col items-center">
            <button
              onClick={() => navigate('/login')}
              className="custom-button"
            >
              <Shield className="h-6 w-6" />
              Login
            </button>

            <button
              onClick={() => navigate('/forgot-password')}
              className="w-full text-center text-sm text-gray-500 hover:text-blue-600 transition-colors font-medium"
            >
              Forgot Password?
            </button>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-8 font-medium">
          © 2025 Microsyslogic. All rights reserved.
        </p>
      </div>
    </div>
    </>
  );
};

export default Welcome;