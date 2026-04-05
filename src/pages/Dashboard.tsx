import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { Link } from "react-router-dom";
import { HandCoins, ArrowUpRight, Plus, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";

export default function Dashboard() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const [escrows, setEscrows] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, disputed: 0, completed: 0 });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("escrows")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => {
        setEscrows(data || []);
        const all = data || [];
        setStats({
          total: all.length,
          active: all.filter((e) => ["active", "paid"].includes(e.status)).length,
          disputed: all.filter((e) => e.status === "disputed").length,
          completed: all.filter((e) => e.status === "completed").length,
        });
      });
  }, [user]);

  const statCards = [
    { label: "Total Escrows", value: stats.total, icon: HandCoins, color: "text-primary" },
    { label: "Active", value: stats.active, icon: Clock, color: "text-primary" },
    { label: "Disputed", value: stats.disputed, icon: AlertTriangle, color: "text-destructive" },
    { label: "Completed", value: stats.completed, icon: HandCoins, color: "text-accent" },
  ];

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">{lang === "zh" ? "仪表板" : lang === "ru" ? "Панель" : lang === "ko" ? "대시보드" : "Dashboard"}</h1>
          <p className="text-muted-foreground mt-1">Welcome back! Here's your escrow overview.</p>
        </div>
        <Link to="/dashboard/escrows/new">
          <Button className="gap-2"><Plus className="h-4 w-4" /> New Escrow</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statCards.map((s) => (
          <div key={s.label} className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="glass-card">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold">Recent Escrows</h2>
          <Link to="/dashboard/escrows" className="text-sm text-primary hover:underline flex items-center gap-1">
            View all <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
        {escrows.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            <HandCoins className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No escrows yet. Create your first one!</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {escrows.map((escrow) => (
              <Link key={escrow.id} to={`/dashboard/escrows/${escrow.id}`}
                className="flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors">
                <div>
                  <p className="font-medium">{escrow.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {escrow.amount} {escrow.crypto_type}
                  </p>
                </div>
                <StatusBadge status={escrow.status} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
