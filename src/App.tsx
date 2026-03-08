import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SportThemeProvider } from "@/contexts/SportThemeContext";
import { CoachFocusProvider } from "@/contexts/CoachFocusContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import AuthPage from "@/pages/AuthPage";
import Dashboard from "@/pages/Dashboard";
import CoachDashboard from "@/pages/CoachDashboard";
import TestEntry from "@/pages/TestEntry";
import BulkTestEntry from "@/pages/BulkTestEntry";
import TeamManagement from "@/pages/TeamManagement";
import ProfilePage from "@/pages/ProfilePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SportThemeProvider>
            <CoachFocusProvider>
              <Routes>
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
                <Route path="/coach" element={<ProtectedRoute><AppLayout><CoachDashboard /></AppLayout></ProtectedRoute>} />
                <Route path="/test-entry" element={<ProtectedRoute><AppLayout><TestEntry /></AppLayout></ProtectedRoute>} />
                <Route path="/bulk-test-entry" element={<ProtectedRoute><AppLayout><BulkTestEntry /></AppLayout></ProtectedRoute>} />
                <Route path="/teams" element={<ProtectedRoute><AppLayout><TeamManagement /></AppLayout></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><AppLayout><ProfilePage /></AppLayout></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </CoachFocusProvider>
          </SportThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
