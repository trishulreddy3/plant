import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Cookie, Shield, Settings, Info } from 'lucide-react';

interface CookiePreferences {
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

interface CookieConsentProps {
  onAccept: (preferences: CookiePreferences) => void;
  onReject: () => void;
}

const CookieConsent: React.FC<CookieConsentProps> = ({ onAccept, onReject }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true, // Always required
    functional: false,
    analytics: false,
    marketing: false
  });

  const handleAcceptAll = () => {
    const allAccepted: CookiePreferences = {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true
    };
    onAccept(allAccepted);
  };

  const handleAcceptSelected = () => {
    onAccept(preferences);
  };

  const handleRejectAll = () => {
    const onlyNecessary: CookiePreferences = {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false
    };
    onAccept(onlyNecessary);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Cookie className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Cookie Consent</CardTitle>
          <CardDescription className="text-base">
            We use cookies to enhance your experience and analyze our website performance. 
            Please choose your cookie preferences below.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Cookie Categories */}
          <div className="space-y-4">
            {/* Necessary Cookies */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50 border-green-200">
              <div className="flex items-center space-x-3">
                <Shield className="h-5 w-5 text-green-600" />
                <div>
                  <Label className="text-sm font-semibold text-green-800">Necessary Cookies</Label>
                  <p className="text-xs text-green-600">
                    Essential for website functionality and security
                  </p>
                </div>
              </div>
              <Switch checked={true} disabled className="opacity-50" />
            </div>

            {/* Functional Cookies */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <Settings className="h-5 w-5 text-blue-600" />
                <div>
                  <Label className="text-sm font-semibold">Functional Cookies</Label>
                  <p className="text-xs text-gray-600">
                    Remember your preferences and settings
                  </p>
                </div>
              </div>
              <Switch 
                checked={preferences.functional}
                onCheckedChange={(checked) => 
                  setPreferences(prev => ({ ...prev, functional: checked }))
                }
              />
            </div>

            {/* Analytics Cookies */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <Info className="h-5 w-5 text-purple-600" />
                <div>
                  <Label className="text-sm font-semibold">Analytics Cookies</Label>
                  <p className="text-xs text-gray-600">
                    Help us understand how you use our website
                  </p>
                </div>
              </div>
              <Switch 
                checked={preferences.analytics}
                onCheckedChange={(checked) => 
                  setPreferences(prev => ({ ...prev, analytics: checked }))
                }
              />
            </div>

            {/* Marketing Cookies */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <Cookie className="h-5 w-5 text-orange-600" />
                <div>
                  <Label className="text-sm font-semibold">Marketing Cookies</Label>
                  <p className="text-xs text-gray-600">
                    Used to deliver relevant advertisements
                  </p>
                </div>
              </div>
              <Switch 
                checked={preferences.marketing}
                onCheckedChange={(checked) => 
                  setPreferences(prev => ({ ...prev, marketing: checked }))
                }
              />
            </div>
          </div>

          {/* Detailed Information */}
          <div className="space-y-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="w-full"
            >
              {showDetails ? 'Hide' : 'Show'} Detailed Information
            </Button>

            {showDetails && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg text-sm">
                <div>
                  <h4 className="font-semibold text-green-800 mb-2">Necessary Cookies</h4>
                  <p className="text-gray-700 mb-2">
                    These cookies are essential for the website to function properly. They include:
                  </p>
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                    <li>Session management and authentication</li>
                    <li>Security tokens and CSRF protection</li>
                    <li>Load balancing and performance</li>
                    <li>Basic website functionality</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold text-blue-800 mb-2">Functional Cookies</h4>
                  <p className="text-gray-700 mb-2">
                    These cookies remember your preferences and settings:
                  </p>
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                    <li>Language and region preferences</li>
                    <li>Theme and display settings</li>
                    <li>User interface customizations</li>
                    <li>Form data and user inputs</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold text-purple-800 mb-2">Analytics Cookies</h4>
                  <p className="text-gray-700 mb-2">
                    These cookies help us understand website usage:
                  </p>
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                    <li>Page views and user interactions</li>
                    <li>Performance metrics and errors</li>
                    <li>User journey and navigation patterns</li>
                    <li>Device and browser information</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold text-orange-800 mb-2">Marketing Cookies</h4>
                  <p className="text-gray-700 mb-2">
                    These cookies are used for advertising purposes:
                  </p>
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                    <li>Ad targeting and personalization</li>
                    <li>Social media integration</li>
                    <li>Third-party advertising networks</li>
                    <li>Conversion tracking</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleRejectAll}
              className="flex-1"
            >
              Reject All
            </Button>
            <Button
              variant="outline"
              onClick={handleAcceptSelected}
              className="flex-1"
            >
              Accept Selected
            </Button>
            <Button
              onClick={handleAcceptAll}
              className="flex-1"
            >
              Accept All
            </Button>
          </div>

          {/* Privacy Policy Link */}
          <div className="text-center text-xs text-gray-500 pt-2">
            By using our website, you agree to our{' '}
            <a href="/privacy-policy" className="text-primary hover:underline">
              Privacy Policy
            </a>{' '}
            and{' '}
            <a href="/terms-of-service" className="text-primary hover:underline">
              Terms of Service
            </a>
            .
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CookieConsent;





