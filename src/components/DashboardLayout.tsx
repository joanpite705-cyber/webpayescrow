import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Shield, LayoutDashboard, HandCoins, MessageSquare, AlertTriangle, Settings, LogOut, Users, Wallet, Bot, ChevronRight, Sliders, Menu, X, History, Coins, Network, ArrowDownToLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import WalletConnectButton from "@/components/WalletConnectButton";
import { t, useLanguage } from "@/lib/i18n";

const userNav = [
  { to: "/dashboard", icon: LayoutDashboard, labelKey: "dashboard" },
  { to: "/dashboard/escrows", icon: HandCoins, labelKey: "my_escrows" },
  { to: "/dashboard/history", icon: History, labelKey: "escrow_history" },
  { to: "/dashboard/disputes", icon: AlertTriangle, labelKey: "disputes" },
  { to: "/dashboard/settings", icon: Settings, labelKey: "settings" },
];

const adminNav = [
  { to: "/admin", icon: Shield, labelKey: "overview" },
  { to: "/admin/users", icon: Users, labelKey: "users" },
  { to: "/admin/escrows", icon: HandCoins, labelKey: "all_escrows" },
  { to: "/admin/payments", icon: Wallet, labelKey: "payments" },
  { to: "/admin/disputes", icon: AlertTriangle, labelKey: "disputes" },
  { to: "/admin/wallets", icon: Wallet, labelKey: "crypto_wallets" },
  { to: "/admin/balances", icon: Coins, labelKey: "balances" },
  { to: "/admin/chains", icon: Network, labelKey: "chains" },
  { to: "/admin/sweeps", icon: ArrowDownToLine, labelKey: "sweeps" },
  { to: "/admin/bot", icon: Bot, labelKey: "bot_config" },
  { to: "/admin/settings", icon: Sliders, labelKey: "platform" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const isAdminRoute = location.pathname.startsWith("/admin");
  const nav = isAdminRoute ? adminNav : userNav;
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileNav = isAdminRoute
    ? [adminNav[0], adminNav[1], adminNav[3], adminNav[7]]
    : [userNav[0], userNav[1], userNav[3], userNav[4]];

  const sidebar = (
    <>
      <div className="p-4 md:p-6 border-b border-border flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
          <Shield className="h-6 w-6 md:h-7 md:w-7 text-primary" />
          <span className="text-lg font-bold gradient-text">EscrowBot</span>
        </Link>
        <button className="md:hidden text-muted-foreground" onClick={() => setMobileOpen(false)}>
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 p-3 md:p-4 space-y-1 overflow-y-auto">
        {nav.map((item) => {
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {t(item.labelKey, lang)}
              {active && <ChevronRight className="h-3 w-3 ml-auto" />}
            </Link>
          );
        })}
      </nav>

      {isAdmin && (
        <div className="p-3 md:p-4 border-t border-border">
          <Link
            to={isAdminRoute ? "/dashboard" : "/admin"}
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            {isAdminRoute ? <LayoutDashboard className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
            {isAdminRoute ? t("user_dashboard", lang) : t("admin_panel", lang)}
          </Link>
        </div>
      )}

      <div className="p-3 md:p-4 border-t border-border">
        <LanguageSwitcher compact />
        <div className="mt-2 px-1">
          <WalletConnectButton compact />
        </div>
        <div className="flex items-center gap-3 px-3 py-2 mt-2">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold shrink-0">
            {profile?.telegram_username?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{profile?.telegram_username || "User"}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2 text-muted-foreground hover:text-destructive"
          onClick={() => { signOut().then(() => navigate("/login")); setMobileOpen(false); }}
        >
          <LogOut className="h-4 w-4 mr-2" />
          {t("sign_out", lang)}
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-card/95 backdrop-blur border-b border-border flex items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <span className="text-base font-bold gradient-text">EscrowBot</span>
        </Link>
        <div className="flex items-center gap-2">
          <WalletConnectButton compact />
          <button onClick={() => setMobileOpen(true)} className="text-foreground">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-card flex flex-col overflow-y-auto">
            {sidebar}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 border-r border-border bg-card/50 flex-col shrink-0">
        {sidebar}
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pt-14 pb-20 md:pt-0 md:pb-0">
        <div className="p-4 md:p-8">{children}</div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-xl">
        <div className="grid grid-cols-4 gap-1 px-2 py-2">
          {mobileNav.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-[11px] transition-colors ${
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span className="truncate max-w-full">{t(item.labelKey, lang)}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
