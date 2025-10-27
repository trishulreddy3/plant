import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Scale, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import Footer from '@/components/Footer';
import BackButton from '@/components/ui/BackButton';

const TermsOfService: React.FC = () => {
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
              <FileText className="h-12 w-12 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-primary">Terms of Service</h1>
            <p className="text-gray-600 mt-2">
              Last updated: January 5, 2025
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Introduction */}
          <Card>
            <CardHeader>
              <CardTitle>Agreement to Terms</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p>
                By accessing and using the Microsyslogic Solar Plant Monitor application 
                ("Service"), you agree to be bound by these Terms of Service ("Terms"). 
                If you disagree with any part of these terms, you may not access the Service.
              </p>
            </CardContent>
          </Card>

          {/* Service Description */}
          <Card>
            <CardHeader>
              <CardTitle>Service Description</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p>
                Microsyslogic provides a comprehensive solar plant monitoring and management 
                system that includes:
              </p>
              <ul>
                <li>Real-time solar panel monitoring</li>
                <li>Performance analytics and reporting</li>
                <li>Fault detection and alerting</li>
                <li>User management and access control</li>
                <li>Data visualization and dashboards</li>
              </ul>
            </CardContent>
          </Card>

          {/* User Responsibilities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Scale className="h-5 w-5 mr-2" />
                User Responsibilities
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <h4>Account Security</h4>
              <ul>
                <li>Maintain the confidentiality of your login credentials</li>
                <li>Use strong, unique passwords</li>
                <li>Notify us immediately of any unauthorized access</li>
                <li>Log out when finished using the Service</li>
              </ul>

              <h4>Acceptable Use</h4>
              <ul>
                <li>Use the Service only for legitimate business purposes</li>
                <li>Comply with all applicable laws and regulations</li>
                <li>Respect the intellectual property rights of others</li>
                <li>Do not attempt to circumvent security measures</li>
              </ul>

              <h4>Prohibited Activities</h4>
              <ul>
                <li>Reverse engineering or decompiling the Service</li>
                <li>Distributing malware or harmful code</li>
                <li>Attempting to gain unauthorized access</li>
                <li>Interfering with the Service's operation</li>
              </ul>
            </CardContent>
          </Card>

          {/* Data and Privacy */}
          <Card>
            <CardHeader>
              <CardTitle>Data and Privacy</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p>
                Your privacy is important to us. Our collection and use of personal information 
                is governed by our{' '}
                <Link to="/privacy-policy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
                , which is incorporated into these Terms by reference.
              </p>
              
              <h4>Data Ownership</h4>
              <p>
                You retain ownership of your solar plant data. We process this data only to 
                provide the Service and improve our offerings.
              </p>

              <h4>Data Security</h4>
              <p>
                We implement industry-standard security measures to protect your data, 
                including encryption, access controls, and regular security audits.
              </p>
            </CardContent>
          </Card>

          {/* Service Availability */}
          <Card>
            <CardHeader>
              <CardTitle>Service Availability</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <h4>Uptime Commitment</h4>
              <p>
                We strive to maintain 99.9% uptime for the Service, but cannot guarantee 
                uninterrupted access due to maintenance, updates, or unforeseen circumstances.
              </p>

              <h4>Maintenance</h4>
              <p>
                We may perform scheduled maintenance that temporarily affects Service 
                availability. We will provide advance notice when possible.
              </p>

              <h4>Service Modifications</h4>
              <p>
                We reserve the right to modify, suspend, or discontinue the Service at any 
                time with reasonable notice.
              </p>
            </CardContent>
          </Card>

          {/* Intellectual Property */}
          <Card>
            <CardHeader>
              <CardTitle>Intellectual Property</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <h4>Our Rights</h4>
              <p>
                The Service and its original content, features, and functionality are owned by 
                Microsyslogic and are protected by international copyright, trademark, patent, 
                trade secret, and other intellectual property laws.
              </p>

              <h4>Your Rights</h4>
              <p>
                You retain ownership of your data and content. By using the Service, you grant 
                us a limited license to use your data solely for providing the Service.
              </p>
            </CardContent>
          </Card>

          {/* Limitation of Liability */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Limitation of Liability
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p>
                <strong>Important:</strong> Please read this section carefully as it limits 
                our liability to you.
              </p>
              
              <h4>Disclaimer</h4>
              <p>
                The Service is provided "as is" and "as available" without warranties of any 
                kind, either express or implied, including but not limited to warranties of 
                merchantability, fitness for a particular purpose, or non-infringement.
              </p>

              <h4>Limitation</h4>
              <p>
                In no event shall Microsyslogic be liable for any indirect, incidental, 
                special, consequential, or punitive damages, including without limitation, 
                loss of profits, data, use, goodwill, or other intangible losses.
              </p>

              <h4>Maximum Liability</h4>
              <p>
                Our total liability to you for any claims arising from or relating to the 
                Service shall not exceed the amount you paid us in the 12 months preceding 
                the claim.
              </p>
            </CardContent>
          </Card>

          {/* Termination */}
          <Card>
            <CardHeader>
              <CardTitle>Termination</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <h4>Termination by You</h4>
              <p>
                You may terminate your account at any time by contacting us at{' '}
                <a href="mailto:support@microsyslogic.com" className="text-primary hover:underline">
                  support@microsyslogic.com
                </a>
              </p>

              <h4>Termination by Us</h4>
              <p>
                We may terminate or suspend your account immediately, without prior notice, 
                for conduct that we believe violates these Terms or is harmful to other users, 
                us, or third parties.
              </p>

              <h4>Effect of Termination</h4>
              <p>
                Upon termination, your right to use the Service will cease immediately. 
                We may delete your account and data after a reasonable period.
              </p>
            </CardContent>
          </Card>

          {/* Governing Law */}
          <Card>
            <CardHeader>
              <CardTitle>Governing Law</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p>
                These Terms shall be governed by and construed in accordance with the laws 
                of [Your Jurisdiction], without regard to its conflict of law provisions.
              </p>
              
              <p>
                Any disputes arising from these Terms or the Service shall be resolved through 
                binding arbitration in accordance with the rules of [Arbitration Organization].
              </p>
            </CardContent>
          </Card>

          {/* Changes to Terms */}
          <Card>
            <CardHeader>
              <CardTitle>Changes to Terms</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p>
                We reserve the right to modify these Terms at any time. We will notify users 
                of any material changes by email or through the Service.
              </p>
              
              <p>
                Your continued use of the Service after such modifications constitutes acceptance 
                of the updated Terms.
              </p>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p>
                If you have any questions about these Terms of Service, please contact us:
              </p>
              <ul>
                <li>Email: <a href="mailto:legal@microsyslogic.com" className="text-primary hover:underline">legal@microsyslogic.com</a></li>
                <li>Support: <a href="mailto:support@microsyslogic.com" className="text-primary hover:underline">support@microsyslogic.com</a></li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default TermsOfService;





