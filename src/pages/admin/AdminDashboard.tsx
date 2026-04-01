import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Shield, Users, HandCoins, Wallet, AlertTriangle, Clock } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, escrows: 0, pendingPayments: 0, openDisputes: 0 });

  useEffect(() => {
    Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("escrows").select("id", { count: "exact", head: true }),
      supabase.from("payments").select("id", { count: "exact", head: true }).in("status", ["pending", "submitted"]),
      supabase.from("disputes").select("id", { count: "exact", head: true }).in("status", ["open", "under_review"]),
    ]).then(([u, e, p, d]) => {
      setStats({
        users: u.count || 0,
        escrows: e.count || 0,
        pendingPayments: p.count || 0,
        openDisputes: d.count || 0,
      });
    });
  }, []);

  const cards = [
    { label: "Total Users", value: stats.users, icon: Users, color: "text-primary" },
    { label: "Total Escrows", value: stats.escrows, icon: HandCoins, color: "text-accent" },
    { label: "Pending Payments", value: stats.pendingPayments, icon: Clock, color: "text-warning" },
    { label: "Open Disputes", value: stats.openDisputes, icon: AlertTriangle, color: "text-destructive" },
  ];

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="h-6 w-6 text-primary" /> Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">System overview and management</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="glass-card p-6">
            <c.icon className={`h-6 w-6 ${c.color} mb-3`} />
            <p className="text-3xl font-bold">{c.value}</p>
            <p className="text-sm text-muted-foreground mt-1">{c.label}</p>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
