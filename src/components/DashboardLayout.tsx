import { useAuth } from "@/contexts/AuthContext";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Shield, LayoutDashboard, HandCoins, MessageSquare, AlertTriangle, Settings, LogOut, Users, Wallet, Bot, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const userNav = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/dashboard/escrows", icon: HandCoins, label: "My Escrows" },
  { to: "/dashboard/disputes", icon: AlertTriangle, label: "Disputes" },
  { to: "/dashboard/settings", icon: Settings, label: "Settings" },
];

const adminNav = [
  { to: "/admin", icon: Shield, label: "Overview" },
  { to: "/admin/users", icon: Users, label: "Users" },
  { to: "/admin/escrows", icon: HandCoins, label: "All Escrows" },
  { to: "/admin/payments", icon: Wallet, label: "Payments" },
  { to: "/admin/disputes", icon: AlertTriangle, label: "Disputes" },
  { to: "/admin/wallets", icon: Wallet, label: "Crypto Wallets" },
  { to: "/admin/bot", icon: Bot, label: "Bot Config" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminRoute = location.pathname.startsWith("/admin");
  const nav = isAdminRoute ? adminNav : userNav;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card/50 flex flex-col">
        <div className="p-6 border-b border-border">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="h-7 w-7 text-primary" />
            <span className="text-lg font-bold gradient-text">EscrowBot</span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {nav.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {active && <ChevronRight className="h-3 w-3 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {isAdmin && (
          <div className="p-4 border-t border-border">
            <Link
              to={isAdminRoute ? "/dashboard" : "/admin"}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              {isAdminRoute ? <LayoutDashboard className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
              {isAdminRoute ? "User Dashboard" : "Admin Panel"}
            </Link>
          </div>
        )}

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold">
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
            onClick={() => signOut().then(() => navigate("/login"))}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
