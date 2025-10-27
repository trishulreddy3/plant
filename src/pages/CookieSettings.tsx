import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Cookie, Shield, Settings, Info, Trash2, Save } from 'lucide-react';
import { 
  getCookiePreferences, 
  saveCookiePreferences, 
  resetCookiePreferences,
  getAllCookies,
  COOKIE_INFO,
  CookiePreferences,
  CookieInfo
} from '@/utils/cookieManager';
import BackButton from '@/components/ui/BackButton';

const CookieSettings: React.FC = () => {
  const [preferences, setPreferences] = useState<CookiePreferences>(getCookiePreferences());
  const [allCookies, setAllCookies] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setAllCookies(getAllCookies());
  }, []);

  const handlePreferenceChange = (category: keyof CookiePreferences, value: boolean) => {
    // Necessary cookies cannot be disabled
    if (category === 'necessary' && !value) return;
    
    setPreferences(prev => ({ ...prev, [category]: value }));
    setHasChanges(true);
  };

  const handleSavePreferences = () => {
    saveCookiePreferences(preferences);
    setHasChanges(false);
    setAllCookies(getAllCookies());
  };

  const handleResetPreferences = () => {
    resetCookiePreferences();
    setPreferences(getCookiePreferences());
    setHasChanges(false);
    setAllCookies(getAllCookies());
  };

  const getCookieCategory = (cookieName: string): CookieInfo | undefined => {
    return COOKIE_INFO.find(cookie => 
      cookie.name === cookieName || 
      cookie.name.includes('*') && cookieName.startsWith(cookie.name.replace('*', ''))
    );
  };

  const getCategoryColor = (category: keyof CookiePreferences): string => {
    switch (category) {
      case 'necessary': return 'bg-green-100 text-green-800 border-green-200';
      case 'functional': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'analytics': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'marketing': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryIcon = (category: keyof CookiePreferences) => {
    switch (category) {
      case 'necessary': return <Shield className="h-4 w-4" />;
      case 'functional': return <Settings className="h-4 w-4" />;
      case 'analytics': return <Info className="h-4 w-4" />;
      case 'marketing': return <Cookie className="h-4 w-4" />;
      default: return <Cookie className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl relative">
      <div className="absolute top-4 left-4 z-10">
        <BackButton />
      </div>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Cookie className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-primary">Cookie Settings</h1>
          <p className="text-gray-600 mt-2">
            Manage your cookie preferences and privacy settings
          </p>
        </div>

        {/* Cookie Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Cookie Preferences</CardTitle>
            <CardDescription>
              Choose which types of cookies you want to allow
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Necessary Cookies */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50 border-green-200">
              <div className="flex items-center space-x-3">
                <Shield className="h-5 w-5 text-green-600" />
                <div>
                  <Label className="text-sm font-semibold text-green-800">Necessary Cookies</Label>
                  <p className="text-xs text-green-600">
                    Essential for website functionality and security. Cannot be disabled.
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
                onCheckedChange={(checked) => handlePreferenceChange('functional', checked)}
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
                onCheckedChange={(checked) => handlePreferenceChange('analytics', checked)}
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
                onCheckedChange={(checked) => handlePreferenceChange('marketing', checked)}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                variant="outline"
                onClick={handleResetPreferences}
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Reset to Defaults
              </Button>
              <Button
                onClick={handleSavePreferences}
                disabled={!hasChanges}
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Preferences
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Current Cookies */}
        <Card>
          <CardHeader>
            <CardTitle>Current Cookies</CardTitle>
            <CardDescription>
              View all cookies currently stored on your device
            </CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(allCookies).length === 0 ? (
              <p className="text-gray-500 text-center py-8">No cookies found</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(allCookies).map(([name, value]) => {
                  const cookieInfo = getCookieCategory(name);
                  const category = cookieInfo?.category || 'necessary';
                  
                  return (
                    <div key={name} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-mono text-sm font-semibold">{name}</span>
                          <Badge className={getCategoryColor(category)}>
                            {getCategoryIcon(category)}
                            <span className="ml-1 capitalize">{category}</span>
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600">
                          {cookieInfo?.purpose || 'Unknown purpose'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Value: {value.length > 50 ? `${value.substring(0, 50)}...` : value}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cookie Information */}
        <Card>
          <CardHeader>
            <CardTitle>Cookie Information</CardTitle>
            <CardDescription>
              Detailed information about each type of cookie we use
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {(['necessary', 'functional', 'analytics', 'marketing'] as const).map(category => {
                const categoryCookies = COOKIE_INFO.filter(cookie => cookie.category === category);
                
                return (
                  <div key={category} className="space-y-3">
                    <div className="flex items-center space-x-2">
                      {getCategoryIcon(category)}
                      <h3 className="text-lg font-semibold capitalize">{category} Cookies</h3>
                      <Badge className={getCategoryColor(category)}>
                        {categoryCookies.length} cookies
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 ml-6">
                      {categoryCookies.map(cookie => (
                        <div key={cookie.name} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-sm font-semibold">{cookie.name}</span>
                            <span className="text-xs text-gray-500">{cookie.expires}</span>
                          </div>
                          <p className="text-sm text-gray-600">{cookie.purpose}</p>
                        </div>
                      ))}
                    </div>
                    
                    {category !== 'marketing' && <Separator />}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Privacy Information */}
        <Card>
          <CardHeader>
            <CardTitle>Privacy Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="prose prose-sm max-w-none">
              <p>
                We respect your privacy and are committed to protecting your personal data. 
                Our cookie usage is designed to enhance your experience while maintaining 
                the highest standards of privacy protection.
              </p>
              
              <h4>Your Rights</h4>
              <ul>
                <li>Right to access your personal data</li>
                <li>Right to rectify inaccurate data</li>
                <li>Right to erase your data</li>
                <li>Right to restrict processing</li>
                <li>Right to data portability</li>
                <li>Right to object to processing</li>
              </ul>
              
              <h4>Contact Us</h4>
              <p>
                If you have any questions about our cookie usage or privacy practices, 
                please contact us at{' '}
                <a href="mailto:privacy@microsyslogic.com" className="text-primary hover:underline">
                  privacy@microsyslogic.com
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CookieSettings;





