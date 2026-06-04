import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { WagmiProvider } from "wagmi";
import type { Config } from "wagmi";
import { initWeb3Stack } from "@/lib/web3";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import UserEscrows from "./pages/UserEscrows";
import CreateEscrow from "./pages/CreateEscrow";
import EscrowDetail from "./pages/EscrowDetail";
import EscrowHistory from "./pages/EscrowHistory";
import UserDisputes from "./pages/UserDisputes";
import UserSettings from "./pages/UserSettings";
import Terms from "./pages/Terms";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminEscrows from "./pages/admin/AdminEscrows";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminDisputes from "./pages/admin/AdminDisputes";
import AdminWallets from "./pages/admin/AdminWallets";
import AdminBotConfig from "./pages/admin/AdminBotConfig";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminBalances from "./pages/admin/AdminBalances";
import AdminChains from "./pages/admin/AdminChains";
import AdminSweeps from "./pages/admin/AdminSweeps";
import AdminUserWallets from "./pages/admin/AdminUserWallets";
import AdminScamReports from "./pages/admin/AdminScamReports";
import ScamCheck from "./pages/ScamCheck";
import NotFound from "./pages/NotFound";
import InstallPrompt from "./components/InstallPrompt";

const queryClient = new QueryClient();

const App = () => {
  const [config, setConfig] = useState<Config | null>(null);
  useEffect(() => { initWeb3Stack().then(setConfig); }, []);
  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }
  return (
  <WagmiProvider config={config}>
   <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <InstallPrompt />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/scam-check" element={<ScamCheck />} />

            {/* User routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard/escrows" element={<ProtectedRoute><UserEscrows /></ProtectedRoute>} />
            <Route path="/dashboard/escrows/new" element={<ProtectedRoute><CreateEscrow /></ProtectedRoute>} />
            <Route path="/dashboard/escrows/:id" element={<ProtectedRoute><EscrowDetail /></ProtectedRoute>} />
            <Route path="/dashboard/history" element={<ProtectedRoute><EscrowHistory /></ProtectedRoute>} />
            <Route path="/dashboard/disputes" element={<ProtectedRoute><UserDisputes /></ProtectedRoute>} />
            <Route path="/dashboard/settings" element={<ProtectedRoute><UserSettings /></ProtectedRoute>} />

            {/* Admin routes */}
            <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute requireAdmin><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/escrows" element={<ProtectedRoute requireAdmin><AdminEscrows /></ProtectedRoute>} />
            <Route path="/admin/payments" element={<ProtectedRoute requireAdmin><AdminPayments /></ProtectedRoute>} />
            <Route path="/admin/disputes" element={<ProtectedRoute requireAdmin><AdminDisputes /></ProtectedRoute>} />
            <Route path="/admin/wallets" element={<ProtectedRoute requireAdmin><AdminWallets /></ProtectedRoute>} />
            <Route path="/admin/balances" element={<ProtectedRoute requireAdmin><AdminBalances /></ProtectedRoute>} />
            <Route path="/admin/chains" element={<ProtectedRoute requireAdmin><AdminChains /></ProtectedRoute>} />
            <Route path="/admin/sweeps" element={<ProtectedRoute requireAdmin><AdminSweeps /></ProtectedRoute>} />
            <Route path="/admin/user-wallets" element={<ProtectedRoute requireAdmin><AdminUserWallets /></ProtectedRoute>} />
            <Route path="/admin/scam-reports" element={<ProtectedRoute requireAdmin><AdminScamReports /></ProtectedRoute>} />
            <Route path="/admin/bot" element={<ProtectedRoute requireAdmin><AdminBotConfig /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute requireAdmin><AdminSettings /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
   </QueryClientProvider>
  </WagmiProvider>
  );
};

export default App;
