import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowDownToLine, RefreshCw, ExternalLink, Loader2, Target, Clock, CheckCircle2, XCircle, Fuel, Activity } from "lucide-react";
import { toast } from "sonner";

export default function AdminSweeps() {
  const [chains, setChains] = useState<any[]>([]);
  const [tokens, setTokens] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  const load = async () => {
    const { data: c } = await (supabase as any).from("chain_configs").select("*").eq("is_active", true).order("sort_order");
    const { data: t } = await (supabase as any).from("chain_tokens").select("*").eq("is_active", true);
    const { data: j } = await (supabase as any).from("sweep_jobs").select("*").order("created_at", { ascending: false }).limit(30);
    setChains(c || []); setTokens(t || []); setJobs(j || []);
  };
  useEffect(() => {
    load();
    const ch = supabase
      .channel("sweep_jobs_live")
      .on("postgres_changes", { event: "*", schema: "public", table: "sweep_jobs" }, (payload: any) => {
        setJobs((prev) => {
          const row = payload.new || payload.old;
          if (!row) return prev;
          if (payload.eventType === "DELETE") return prev.filter((j) => j.id !== row.id);
          const idx = prev.findIndex((j) => j.id === row.id);
          if (idx === -1) return [row, ...prev].slice(0, 50);
          const next = [...prev]; next[idx] = row; return next;
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const sweep = async (chain_key: string, token_symbol?: string) => {
    const key = `${chain_key}:${token_symbol ?? "native"}`;
    setBusy(key);
    const to_address = overrides[chain_key]?.trim() || undefined;
    const { data, error } = await supabase.functions.invoke("admin-sweep", { body: { chain_key, token_symbol, to_address } });
    setBusy(null);
    if (error || (data as any)?.error) toast.error(((data as any)?.error) || error?.message || "Sweep failed");
    else toast.success(`Sweep submitted: ${(data as any)?.tx?.slice(0, 12)}…`);
    load();
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ArrowDownToLine className="h-6 w-6 text-primary" /> Treasury Sweeps</h1>
          <p className="text-muted-foreground mt-1">Move funds from each treasury to its cold wallet. EVM signing is automatic; non-EVM chains require manual signing.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-2"><RefreshCw className="h-4 w-4" /> Refresh</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {chains.map((c) => {
          const chainTokens = tokens.filter((t) => t.chain_key === c.chain_key);
          const chainJobs = jobs.filter((j) => j.chain_key === c.chain_key);
          const pending = chainJobs.filter((j) => ["pending", "sweeping", "gas_funding"].includes(j.status)).length;
          const completed = chainJobs.filter((j) => j.status === "completed").length;
          const failed = chainJobs.filter((j) => j.status === "failed").length;
          return (
            <div key={c.id} className="glass-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold">{c.display_name}</p>
                  <p className="text-xs text-muted-foreground font-mono truncate max-w-[16rem]">{c.cold_wallet_address || "no cold wallet set"}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${c.family === "evm" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{c.family.toUpperCase()}</span>
              </div>
              <div className="flex items-center gap-3 mb-3 text-[11px]">
                <span className="flex items-center gap-1 text-amber-500"><Clock className="h-3 w-3" /> {pending}</span>
                <span className="flex items-center gap-1 text-emerald-500"><CheckCircle2 className="h-3 w-3" /> {completed}</span>
                <span className="flex items-center gap-1 text-destructive"><XCircle className="h-3 w-3" /> {failed}</span>
              </div>
              <div className="mb-3">
                <Label className="text-[10px] flex items-center gap-1 text-muted-foreground"><Target className="h-3 w-3" /> Override destination (optional)</Label>
                <Input
                  className="mt-1 font-mono text-xs h-8"
                  placeholder={c.cold_wallet_address || "Paste destination address"}
                  value={overrides[c.chain_key] || ""}
                  onChange={(e) => setOverrides({ ...overrides, [c.chain_key]: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Button size="sm" className="w-full gap-2" disabled={!(c.cold_wallet_address || overrides[c.chain_key]?.trim()) || busy === `${c.chain_key}:native`} onClick={() => sweep(c.chain_key)}>
                  {busy === `${c.chain_key}:native` ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownToLine className="h-4 w-4" />}
                  Sweep {c.native_symbol}
                </Button>
                {chainTokens.map((t) => (
                  <Button key={t.id} size="sm" variant="outline" className="w-full gap-2" disabled={!(c.cold_wallet_address || overrides[c.chain_key]?.trim()) || busy === `${c.chain_key}:${t.symbol}`} onClick={() => sweep(c.chain_key, t.symbol)}>
                    {busy === `${c.chain_key}:${t.symbol}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownToLine className="h-4 w-4" />}
                    Sweep {t.symbol}
                  </Button>
                ))}
              </div>
            </div>
          );
        })}
        {chains.length === 0 && <p className="text-sm text-muted-foreground col-span-2">No active chains. Configure them in Chains & Treasury.</p>}
      </div>

      <div className="glass-card">
        <div className="p-4 border-b border-border"><h3 className="font-semibold text-sm">Recent sweep jobs</h3></div>
        {jobs.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">No sweeps yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {jobs.map((j) => {
              const chain = chains.find((c) => c.chain_key === j.chain_key);
              const explorer = chain?.explorer_url;
              return (
                <div key={j.id} className="p-4 flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{j.chain_key.toUpperCase()} · {j.token_symbol} {j.amount ? `· ${j.amount}` : ""}</p>
                    <p className="text-xs text-muted-foreground">{new Date(j.created_at).toLocaleString()} · {j.status}{j.error_message ? ` · ${j.error_message}` : ""}</p>
                  </div>
                  {j.sweep_tx && explorer && (
                    <a href={`${explorer}/tx/${j.sweep_tx}`} target="_blank" rel="noreferrer" className="text-primary text-xs flex items-center gap-1 hover:underline">
                      View <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}