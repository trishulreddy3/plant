import React from 'react';
import { Shield, Mail } from 'lucide-react';

interface FooterProps {
  userRole?: 'super_admin' | 'plant_admin' | 'user';
}

const Footer: React.FC<FooterProps> = ({ userRole }) => {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              {userRole === 'user' ? (
                <>
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2" />
                    <a href="mailto:SuperAdmin.Microsyslogic@gmail.com" className="hover:text-primary">
                      SuperAdmin.Microsyslogic@gmail.com
                    </a>
                  </div>
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2" />
                    <a href="mailto:companyAdmin@gmail.com" className="hover:text-primary">
                      companyAdmin@gmail.com
                    </a>
                  </div>
                </>
              ) : userRole === 'plant_admin' ? (
                <>
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2" />
                    <a href="mailto:SuperAdmin.Microsyslogic@gmail.com" className="hover:text-primary">
                      SuperAdmin.Microsyslogic@gmail.com
                    </a>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2" />
                    <a href="mailto:SuperAdmin.Microsyslogic@gmail.com" className="hover:text-primary">
                      SuperAdmin.Microsyslogic@gmail.com
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-200 mt-6 pt-4 text-center text-sm text-gray-500">
          © 2025 Microsyslogic. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
