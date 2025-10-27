import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import Welcome from "./pages/Welcome";
import AdminLogin from "./pages/AdminLogin";
import UnifiedLogin from "./pages/UnifiedLogin";
import ForgotPassword from "./pages/ForgotPassword";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import PlantAdminDashboard from "./pages/PlantAdminDashboard";
import PlantMonitor from "./pages/PlantMonitor";
import TechnicianDashboard from "./pages/TechnicianDashboard";
import TechnicianWelcome from "./pages/TechnicianWelcome";
import AddCompany from "./pages/AddCompany";
import Infrastructure from "./pages/Infrastructure";
import AddTable from "./pages/AddTable";
import ExistingStaffMembers from "./pages/ExistingStaffMembers";
import AddStaff from "./pages/AddStaff";
import EditStaff from "./pages/EditStaff";
import CompanyMonitor from "./pages/CompanyMonitor";
import PlantView from "./pages/PlantView";
import AuthTest from "./pages/AuthTest";
import CookieSettings from "./pages/CookieSettings";
import CookieInspector from "./pages/CookieInspector";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import NotFound from "./pages/NotFound";
import CookieConsent from "./components/CookieConsent";
import AutoLogin from "./components/AutoLogin";
import {
  shouldShowConsentBanner,
  initializeCookieManagement,
  saveCookiePreferences,
  CookiePreferences
} from "./utils/cookieManager";

const queryClient = new QueryClient();

const App = () => {
  const [showCookieConsent, setShowCookieConsent] = useState(false);

  useEffect(() => {
    // Initialize cookie management
    initializeCookieManagement();
    
    // Check if we need to show cookie consent banner
    const shouldShow = shouldShowConsentBanner();
    console.log('🍪 Should show cookie consent banner:', shouldShow);
    setShowCookieConsent(shouldShow);
  }, []);

  const handleCookieConsent = (preferences: CookiePreferences) => {
    // Save preferences and hide banner
    console.log('🍪 Handling cookie consent:', preferences);
    saveCookiePreferences(preferences);
    setShowCookieConsent(false);
    console.log('🍪 Cookie consent banner hidden');
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AutoLogin>
            <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/login" element={<UnifiedLogin />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            
            {/* Super Admin Routes */}
            <Route path="/super-admin-dashboard" element={<SuperAdminDashboard />} />
            <Route path="/add-company" element={<AddCompany />} />
            <Route path="/company-monitor/:companyId" element={<CompanyMonitor />} />
            <Route path="/plant-view/:companyId" element={<PlantView />} />
            
            {/* Plant Admin Routes */}
            <Route path="/plant-admin-dashboard" element={<PlantAdminDashboard />} />
            <Route path="/plant-monitor" element={<PlantMonitor />} />
            <Route path="/infrastructure" element={<Infrastructure />} />
            <Route path="/add-table" element={<AddTable />} />
            <Route path="/existing-staff-members" element={<ExistingStaffMembers />} />
            <Route path="/add-staff" element={<AddStaff />} />
            <Route path="/edit-staff" element={<EditStaff />} />
            
            {/* Technician Routes */}
            <Route path="/technician-welcome" element={<TechnicianWelcome />} />
            <Route path="/technician-dashboard" element={<TechnicianDashboard />} />
            
            {/* Debug Routes */}
            <Route path="/auth-test" element={<AuthTest />} />
            
            {/* Cookie Settings */}
            <Route path="/cookie-settings" element={<CookieSettings />} />
            
            {/* Cookie Inspector */}
            <Route path="/cookie-inspector" element={<CookieInspector />} />
            
            {/* Privacy Policy */}
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            
            {/* Terms of Service */}
            <Route path="/terms-of-service" element={<TermsOfService />} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </AutoLogin>
        </BrowserRouter>

        {/* Cookie Consent Banner */}
        {showCookieConsent && (
          <CookieConsent onAccept={handleCookieConsent} onReject={() => setShowCookieConsent(false)} />
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
