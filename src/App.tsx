import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
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
import NotFound from "./pages/NotFound";
import AutoLogin from "./components/AutoLogin";

const queryClient = new QueryClient();

const App = () => {
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

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AutoLogin>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
