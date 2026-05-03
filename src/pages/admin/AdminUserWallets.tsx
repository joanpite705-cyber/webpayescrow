import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Wallet, RefreshCw, ShieldCheck, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminUserWallets() {
  const [rows, setRows] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [chains, setChains] = useState<any[]>([]);
  const [balances, setBalances] = useState<Record<string, any[]>>({});
  const [syncing, setSyncing] = useState(false);

  const load = async () => {
    const [{ data: w }, { data: p }, { data: c }] = await Promise.all([
      supabase.from("connected_wallets").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, telegram_username, display_name"),
      (supabase as any).rpc("get_public_chains"),
    ]);
    setRows(w || []);
    const byId: Record<string, any> = {};
    (p || []).forEach((x: any) => (byId[x.id] = x));
    setProfiles(byId);
    setChains(c || []);
  };
  useEffect(() => { load(); }, []);

  const syncAll = async () => {
    if (!rows.length) return;
    setSyncing(true);
    try {
      const addresses = rows.flatMap((r) =>
        chains.filter((ch) => ch.family === "evm").map((ch) => ({ chain_key: ch.chain_key, address: r.address }))
      );
      const { data, error } = await supabase.functions.invoke("chain-balances", { body: { addresses } });
      if (error) throw error;
      const grouped: Record<string, any[]> = {};
      ((data as any)?.balances || []).forEach((b: any) => {
        grouped[b.address] = grouped[b.address] || [];
        grouped[b.address].push(b);
      });
      setBalances(grouped);
      toast.success("All assets synced");
    } catch (e: any) {
      toast.error(e.message || "Sync failed");
    }
    setSyncing(false);
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Wallet className="h-6 w-6 text-primary" /> User Wallets Management</h1>
          <p className="text-muted-foreground mt-1">Monitor and manage all Web3 wallet connections across the platform.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} className="gap-2"><RefreshCw className="h-4 w-4" /> Refresh</Button>
          <Button size="sm" onClick={syncAll} disabled={syncing} className="gap-2">
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Sync All Assets
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <Stat label="All Wallets" value={rows.length} />
        <Stat label="Unique Users" value={new Set(rows.map((r) => r.user_id)).size} />
        <Stat label="Sweep Ready" value={rows.length ? "✓" : "—"} />
      </div>

      <div className="glass-card">
        {rows.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground"><Wallet className="h-10 w-10 mx-auto mb-3 opacity-50" /><p>No connected wallets yet.</p></div>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((w) => {
              const p = profiles[w.user_id];
              const bals = balances[w.address] || [];
              return (
                <div key={w.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="font-medium">@{p?.telegram_username || p?.display_name || "user"}</p>
                      <p className="text-xs text-muted-foreground font-mono break-all mt-0.5">{w.address}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">Chain ID: {w.chain_id ?? "—"} · {new Date(w.created_at).toLocaleDateString()}</p>
                    </div>
                    {bals.length > 0 && (
                      <div className="text-xs space-y-0.5 text-right">
                        {bals.filter((b) => b.balance !== "0").slice(0, 6).map((b, i) => (
                          <div key={i}><span className="text-muted-foreground">{b.chain_key}:</span> {(Number(b.balance) / 10 ** b.decimals).toFixed(4)} {b.symbol}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="glass-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}