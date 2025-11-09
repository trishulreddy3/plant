import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Cookie, RefreshCw } from 'lucide-react';
import { getAllCookies, getCookiePreferences, COOKIE_INFO } from '@/utils/cookieManager';
import BackButton from '@/components/ui/BackButton';

const CookieInspector: React.FC = () => {
  const [cookies, setCookies] = useState<Record<string, string>>({});
  const [preferences, setPreferences] = useState(getCookiePreferences());
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const refreshCookies = () => {
    setCookies(getAllCookies());
    setPreferences(getCookiePreferences());
    setLastUpdated(new Date());
  };

  useEffect(() => {
    refreshCookies();
  }, []);

  const getCookieInfo = (cookieName: string) => {
    return COOKIE_INFO.find(cookie => 
      cookie.name === cookieName || 
      (cookie.name.includes('*') && cookieName.startsWith(cookie.name.replace('*', '')))
    );
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'necessary': return 'bg-green-100 text-green-800 border-green-200';
      case 'functional': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'analytics': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'marketing': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl relative">
      <div className="absolute top-4 left-4 z-10">
        <BackButton />
      </div>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Eye className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-primary">Cookie Inspector</h1>
          <p className="text-gray-600 mt-2">
            View all cookies and their information in real-time
          </p>
          <div className="mt-4">
            <Button onClick={refreshCookies} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Cookies
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
        </div>

        {/* Current Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Cookie className="h-5 w-5 mr-2" />
              Current Cookie Preferences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(preferences).map(([category, enabled]) => (
                <div key={category} className="text-center">
                  <Badge className={getCategoryColor(category)}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Badge>
                  <p className="text-sm mt-1">
                    {enabled ? '✅ Enabled' : '❌ Disabled'}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* All Cookies */}
        <Card>
          <CardHeader>
            <CardTitle>All Cookies ({Object.keys(cookies).length})</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(cookies).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Cookie className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No cookies found</p>
                <p className="text-sm">Cookies will appear here when they are set</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(cookies).map(([name, value]) => {
                  const cookieInfo = getCookieInfo(name);
                  const category = cookieInfo?.category || 'unknown';
                  
                  return (
                    <div key={name} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-sm font-semibold">{name}</span>
                          <Badge className={getCategoryColor(category)}>
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                          </Badge>
                        </div>
                        <span className="text-xs text-gray-500">
                          {cookieInfo?.expires || 'Unknown expiry'}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <div>
                          <span className="text-xs text-gray-600">Value:</span>
                          <p className="font-mono text-sm bg-gray-100 p-2 rounded break-all">
                            {value.length > 100 ? `${value.substring(0, 100)}...` : value}
                          </p>
                        </div>
                        
                        {cookieInfo && (
                          <div>
                            <span className="text-xs text-gray-600">Purpose:</span>
                            <p className="text-sm text-gray-700">{cookieInfo.purpose}</p>
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>Length: {value.length} chars</span>
                          <span>Type: {typeof value}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cookie Categories Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Cookie Categories Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(['necessary', 'functional', 'analytics', 'marketing'] as const).map(category => {
                const categoryCookies = Object.keys(cookies).filter(name => {
                  const info = getCookieInfo(name);
                  return info?.category === category;
                });
                
                return (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge className={getCategoryColor(category)}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        {categoryCookies.length} cookies
                      </span>
                    </div>
                    
                    {categoryCookies.length > 0 ? (
                      <ul className="text-sm space-y-1">
                        {categoryCookies.map(cookieName => (
                          <li key={cookieName} className="font-mono text-xs">
                            {cookieName}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">No cookies in this category</p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to View Cookies</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <h4>Method 1: Browser Developer Tools</h4>
            <ol>
              <li>Right-click on the page → <strong>Inspect</strong></li>
              <li>Go to <strong>Application</strong> tab (Chrome) or <strong>Storage</strong> tab (Firefox)</li>
              <li>Expand <strong>Cookies</strong> → Click your domain</li>
              <li>View all cookies with their values and properties</li>
            </ol>

            <h4>Method 2: This Inspector Page</h4>
            <p>
              This page shows all cookies in real-time. Click "Refresh Cookies" to update the list.
            </p>

            <h4>Method 3: Cookie Settings Page</h4>
            <p>
              Visit <code>/cookie-settings</code> to manage preferences and view cookie information.
            </p>

            <h4>Method 4: Console Commands</h4>
            <p>Open browser console and run:</p>
            <pre className="bg-gray-100 p-2 rounded text-xs">
{`// View all cookies
document.cookie

// View specific cookie
document.cookie.split(';').find(c => c.includes('cookieName'))

// View localStorage preferences
localStorage.getItem('cookie-preferences')`}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CookieInspector;





