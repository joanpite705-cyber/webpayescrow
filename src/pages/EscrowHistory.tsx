import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Download, History } from "lucide-react";
import { t, getUserLanguage } from "@/lib/i18n";

export default function EscrowHistory() {
  const { user } = useAuth();
  const lang = getUserLanguage();
  const [escrows, setEscrows] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalTrades: 0, totalVolume: 0, totalFees: 0 });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("escrows")
      .select("*")
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const all = data || [];
        setEscrows(all);
        setStats({
          totalTrades: all.length,
          totalVolume: all.reduce((s, e) => s + Number(e.amount), 0),
          totalFees: all.reduce((s, e) => s + Number(e.fee_amount || 0), 0),
        });
      });
  }, [user]);

  const exportCSV = () => {
    const headers = ["Title", "Amount", "Crypto", "Fee", "Status", "Created"];
    const rows = escrows.map((e) => [
      e.title, e.amount, e.crypto_type, e.fee_amount || 0, e.status,
      new Date(e.created_at).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "escrow_history.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <History className="h-5 w-5 text-primary" /> {t("escrow_history", lang) || "Trade History"}
        </h1>
        <Button onClick={exportCSV} variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="glass-card p-4 md:p-5">
          <p className="text-xs text-muted-foreground">{t("total_trades", lang)}</p>
          <p className="text-2xl font-bold mt-1">{stats.totalTrades}</p>
        </div>
        <div className="glass-card p-4 md:p-5">
          <p className="text-xs text-muted-foreground">Total Volume</p>
          <p className="text-2xl font-bold mt-1">{stats.totalVolume.toFixed(4)}</p>
        </div>
        <div className="glass-card p-4 md:p-5">
          <p className="text-xs text-muted-foreground">Fees Collected</p>
          <p className="text-2xl font-bold mt-1 text-warning">{stats.totalFees.toFixed(4)}</p>
        </div>
      </div>

      <div className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="p-3 md:p-4">{t("title", lang)}</th>
              <th className="p-3 md:p-4">{t("amount", lang)}</th>
              <th className="p-3 md:p-4">{t("fee", lang)}</th>
              <th className="p-3 md:p-4">{t("status", lang)}</th>
              <th className="p-3 md:p-4 hidden sm:table-cell">{t("created", lang) || "Date"}</th>
            </tr>
          </thead>
          <tbody>
            {escrows.map((e) => (
              <tr key={e.id} className="border-b border-border/50">
                <td className="p-3 md:p-4 font-medium">{e.title}</td>
                <td className="p-3 md:p-4 font-mono">{e.amount} {e.crypto_type}</td>
                <td className="p-3 md:p-4 font-mono text-warning">{e.fee_amount || 0}</td>
                <td className="p-3 md:p-4"><StatusBadge status={e.status} /></td>
                <td className="p-3 md:p-4 text-muted-foreground hidden sm:table-cell">{new Date(e.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {escrows.length === 0 && (
              <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">No completed trades yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
