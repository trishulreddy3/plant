import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { useState, useEffect } from "react";
import Welcome from "./pages/Welcome";
import UnifiedLogin from "./pages/UnifiedLogin";
import ForgotPassword from "./pages/ForgotPassword";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import PlantAdminDashboard from "./pages/PlantAdminDashboard";
import PlantMonitor from "./pages/PlantMonitor";
import TechnicianDashboard from "./pages/TechnicianDashboard";
import AddCompany from "./pages/AddCompany";
import Infrastructure from "./pages/Infrastructure";
import AddTable from "./pages/AddTable";
import ExistingStaffMembers from "./pages/ExistingStaffMembers";
import AddStaff from "./pages/AddStaff";
import EditStaff from "./pages/EditStaff";
import EditTable from "./pages/EditTable";
import Staff from "./pages/Staff";
import CompanyMonitor from "./pages/CompanyMonitor";
import PlantView from "./pages/PlantView";
import SecurityManagement from "./pages/SecurityManagement";

import CookieSettings from "./pages/CookieSettings";
import CookieInspector from "./pages/CookieInspector";
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
        <AuthProvider>
          <BrowserRouter>
            <AutoLogin>
              <Routes>
                <Route path="/" element={<Welcome />} />
                <Route path="/login" element={<UnifiedLogin />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />

                {/* Super Admin Routes */}
                <Route path="/super-admin-dashboard" element={<SuperAdminDashboard />} />
                <Route path="/add-company" element={<AddCompany />} />
                <Route path="/company-monitor/:companyId" element={<CompanyMonitor />} />
                <Route path="/plant-view/:companyId" element={<PlantView />} />

                {/* Plant Admin Routes */}
                <Route path="/plant-admin-dashboard" element={<PlantAdminDashboard />}>
                  <Route index element={<Navigate to="staff" replace />} />
                  <Route path="staff" element={<Staff />} />
                  <Route path="infrastructure" element={<Infrastructure />} />
                  <Route path="security" element={<SecurityManagement />} />
                </Route>
                <Route path="/plant-monitor" element={<PlantMonitor />} />
                <Route path="/add-table" element={<AddTable />} />
                <Route path="/edit-table" element={<EditTable />} />
                <Route path="/existing-staff-members" element={<ExistingStaffMembers />} />
                <Route path="/add-staff" element={<AddStaff />} />
                <Route path="/edit-staff" element={<EditStaff />} />

                <Route path="/technician-dashboard" element={<TechnicianDashboard />} />
                {/* Redirect old welcome route */}
                <Route path="/technician-welcome" element={<Navigate to="/technician-dashboard" replace />} />



                {/* Cookie Settings */}
                <Route path="/cookie-settings" element={<CookieSettings />} />

                {/* Cookie Inspector */}
                <Route path="/cookie-inspector" element={<CookieInspector />} />

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AutoLogin>
          </BrowserRouter>
        </AuthProvider>

        {/* Cookie Consent Banner */}
        {showCookieConsent && (
          <CookieConsent onAccept={handleCookieConsent} onReject={() => setShowCookieConsent(false)} />
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
