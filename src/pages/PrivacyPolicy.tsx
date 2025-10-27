import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield, Eye, Database, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import Footer from '@/components/Footer';
import BackButton from '@/components/ui/BackButton';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="absolute top-4 left-4 z-10">
        <BackButton />
      </div>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link to="/">
            <Button variant="outline" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Shield className="h-12 w-12 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-primary">Privacy Policy</h1>
            <p className="text-gray-600 mt-2">
              Last updated: January 5, 2025
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Introduction */}
          <Card>
            <CardHeader>
              <CardTitle>Introduction</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p>
                Microsyslogic ("we," "our," or "us") is committed to protecting your privacy. 
                This Privacy Policy explains how we collect, use, disclose, and safeguard your 
                information when you use our Solar Plant Monitor application.
              </p>
              <p>
                By using our service, you agree to the collection and use of information in 
                accordance with this policy.
              </p>
            </CardContent>
          </Card>

          {/* Information We Collect */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Eye className="h-5 w-5 mr-2" />
                Information We Collect
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <h4>Personal Information</h4>
              <ul>
                <li>Email addresses for authentication</li>
                <li>User roles and permissions</li>
                <li>Company affiliation</li>
                <li>Login timestamps and session data</li>
              </ul>

              <h4>Technical Information</h4>
              <ul>
                <li>IP addresses for security and analytics</li>
                <li>Browser type and version</li>
                <li>Device information</li>
                <li>Usage patterns and performance metrics</li>
              </ul>

              <h4>Solar Plant Data</h4>
              <ul>
                <li>Panel performance metrics</li>
                <li>Energy production data</li>
                <li>Fault reports and maintenance logs</li>
                <li>System configuration data</li>
              </ul>
            </CardContent>
          </Card>

          {/* How We Use Information */}
          <Card>
            <CardHeader>
              <CardTitle>How We Use Your Information</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <h4>Service Provision</h4>
              <ul>
                <li>Authenticate users and manage access</li>
                <li>Provide solar plant monitoring services</li>
                <li>Generate reports and analytics</li>
                <li>Send notifications and alerts</li>
              </ul>

              <h4>Security and Compliance</h4>
              <ul>
                <li>Prevent unauthorized access</li>
                <li>Detect and prevent fraud</li>
                <li>Comply with legal obligations</li>
                <li>Maintain system security</li>
              </ul>

              <h4>Improvement and Analytics</h4>
              <ul>
                <li>Analyze usage patterns</li>
                <li>Improve service performance</li>
                <li>Develop new features</li>
                <li>Conduct research and development</li>
              </ul>
            </CardContent>
          </Card>

          {/* Data Storage and Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lock className="h-5 w-5 mr-2" />
                Data Storage and Security
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <h4>Security Measures</h4>
              <ul>
                <li>Encryption in transit and at rest</li>
                <li>Secure authentication protocols</li>
                <li>Regular security audits</li>
                <li>Access controls and monitoring</li>
              </ul>

              <h4>Data Retention</h4>
              <ul>
                <li>User data: Retained while account is active</li>
                <li>Session data: Automatically deleted after 24 hours</li>
                <li>Analytics data: Aggregated and anonymized</li>
                <li>Logs: Retained for security purposes (max 1 year)</li>
              </ul>

              <h4>Data Location</h4>
              <p>
                Your data is stored on secure servers located in compliance with 
                applicable data protection regulations. We use industry-standard 
                cloud providers with robust security measures.
              </p>
            </CardContent>
          </Card>

          {/* Cookies and Tracking */}
          <Card>
            <CardHeader>
              <CardTitle>Cookies and Tracking</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <h4>Types of Cookies</h4>
              <ul>
                <li><strong>Necessary:</strong> Essential for website functionality</li>
                <li><strong>Functional:</strong> Remember your preferences</li>
                <li><strong>Analytics:</strong> Help us understand usage patterns</li>
                <li><strong>Marketing:</strong> Deliver relevant advertisements</li>
              </ul>

              <h4>Cookie Management</h4>
              <p>
                You can manage your cookie preferences at any time through our 
                <Link to="/cookie-settings" className="text-primary hover:underline"> Cookie Settings</Link> page.
              </p>
            </CardContent>
          </Card>

          {/* Your Rights */}
          <Card>
            <CardHeader>
              <CardTitle>Your Rights</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <h4>Under GDPR and CCPA</h4>
              <ul>
                <li><strong>Right to Access:</strong> Request copies of your personal data</li>
                <li><strong>Right to Rectification:</strong> Correct inaccurate information</li>
                <li><strong>Right to Erasure:</strong> Request deletion of your data</li>
                <li><strong>Right to Restrict:</strong> Limit how we process your data</li>
                <li><strong>Right to Portability:</strong> Receive your data in a portable format</li>
                <li><strong>Right to Object:</strong> Object to certain processing activities</li>
              </ul>

              <h4>How to Exercise Your Rights</h4>
              <p>
                To exercise any of these rights, please contact us at{' '}
                <a href="mailto:privacy@microsyslogic.com" className="text-primary hover:underline">
                  privacy@microsyslogic.com
                </a>
              </p>
            </CardContent>
          </Card>

          {/* Third-Party Services */}
          <Card>
            <CardHeader>
              <CardTitle>Third-Party Services</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p>
                We may use third-party services for analytics, monitoring, and other purposes. 
                These services have their own privacy policies:
              </p>
              <ul>
                <li>Google Analytics (if enabled)</li>
                <li>Cloud hosting providers</li>
                <li>Security monitoring services</li>
                <li>Email delivery services</li>
              </ul>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p>
                If you have any questions about this Privacy Policy or our data practices, 
                please contact us:
              </p>
              <ul>
                <li>Email: <a href="mailto:privacy@microsyslogic.com" className="text-primary hover:underline">privacy@microsyslogic.com</a></li>
                <li>Support: <a href="mailto:support@microsyslogic.com" className="text-primary hover:underline">support@microsyslogic.com</a></li>
              </ul>
            </CardContent>
          </Card>

          {/* Changes to Policy */}
          <Card>
            <CardHeader>
              <CardTitle>Changes to This Policy</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p>
                We may update this Privacy Policy from time to time. We will notify you of 
                any changes by posting the new Privacy Policy on this page and updating 
                the "Last updated" date.
              </p>
              <p>
                You are advised to review this Privacy Policy periodically for any changes. 
                Changes to this Privacy Policy are effective when they are posted on this page.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;





