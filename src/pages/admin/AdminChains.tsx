import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Network, Save, Plus, Trash2, ChevronDown, ChevronUp, Coins, Wand2 } from "lucide-react";

type Chain = any;
type Token = { id?: string; chain_key: string; symbol: string; contract_address: string; decimals: number; is_active: boolean };

export default function AdminChains() {
  const [chains, setChains] = useState<Chain[]>([]);
  const [tokens, setTokens] = useState<Record<string, Token[]>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: c } = await (supabase as any).from("chain_configs").select("*").order("sort_order");
    const { data: t } = await (supabase as any).from("chain_tokens").select("*");
    setChains(c || []);
    const grouped: Record<string, Token[]> = {};
    (t || []).forEach((row: Token) => {
      grouped[row.chain_key] = grouped[row.chain_key] || [];
      grouped[row.chain_key].push(row);
    });
    setTokens(grouped);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // Apply shared EVM treasury/gas keys to all EVM chains in one click
  const applyEvmShared = async () => {
    const eth = chains.find((c) => c.chain_key === "ethereum");
    if (!eth) return toast.error("Configure Ethereum first");
    const patch = {
      treasury_address: eth.treasury_address,
      treasury_private_key: eth.treasury_private_key,
      gas_wallet_address: eth.gas_wallet_address,
      gas_wallet_private_key: eth.gas_wallet_private_key,
    };
    const evmKeys = chains.filter((c) => c.family === "evm" && c.chain_key !== "ethereum").map((c) => c.id);
    if (!evmKeys.length) return;
    const { error } = await (supabase as any).from("chain_configs").update(patch).in("id", evmKeys);
    if (error) toast.error(error.message); else { toast.success("Shared EVM keys applied"); load(); }
  };

  const save = async (c: Chain) => {
    const { id, ...patch } = c;
    const { error } = await (supabase as any).from("chain_configs").update(patch).eq("id", id);
    if (error) toast.error(error.message); else toast.success(`${c.display_name} saved`);
  };

  const update = (i: number, k: string, v: any) => {
    const next = [...chains];
    next[i] = { ...next[i], [k]: v };
    setChains(next);
  };

  const addToken = async (chain_key: string) => {
    const { error } = await (supabase as any).from("chain_tokens").insert({ chain_key, symbol: "USDT", contract_address: "", decimals: 6, is_active: true });
    if (error) toast.error(error.message); else load();
  };
  const updateToken = async (id: string, patch: Partial<Token>) => {
    const { error } = await (supabase as any).from("chain_tokens").update(patch).eq("id", id);
    if (error) toast.error(error.message); else load();
  };
  const deleteToken = async (id: string) => {
    const { error } = await (supabase as any).from("chain_tokens").delete().eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Network className="h-6 w-6 text-primary" /> Chains & Treasury</h1>
            <p className="text-muted-foreground mt-1">RPC and explorer endpoints are auto-configured. You only need to set the treasury, gas wallet and cold (sweep) wallet.</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={applyEvmShared}>
            <Wand2 className="h-4 w-4" /> Copy Ethereum keys to all EVM
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {chains.map((c, i) => {
          const isOpen = open === c.id;
          return (
            <div key={c.id} className="glass-card">
              <button className="w-full p-4 flex items-center justify-between" onClick={() => setOpen(isOpen ? null : c.id)}>
                <div className="flex items-center gap-3">
                  <div className={`h-2.5 w-2.5 rounded-full ${c.is_active ? "bg-emerald-400" : "bg-muted-foreground/40"}`} />
                  <div className="text-left">
                    <p className="font-semibold">{c.display_name} <span className="text-xs text-muted-foreground">({c.family.toUpperCase()})</span></p>
                    <p className="text-xs text-muted-foreground font-mono truncate max-w-md">{c.treasury_address || "no treasury set"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={c.is_active} onCheckedChange={(v) => { update(i, "is_active", v); save({ ...c, is_active: v }); }} onClick={(e) => e.stopPropagation()} />
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </button>
              {isOpen && (
                <div className="p-4 border-t border-border space-y-4">
                  <div className="text-xs text-muted-foreground bg-secondary/30 rounded p-2 font-mono break-all">
                    RPC: {c.rpc_url || "—"}<br/>Explorer: {c.explorer_url || "—"}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="Treasury Address (deposits)" v={c.treasury_address} onChange={(v) => update(i, "treasury_address", v)} placeholder="0x..." />
                    <Field label="Treasury Private Key" type="password" v={c.treasury_private_key} onChange={(v) => update(i, "treasury_private_key", v)} placeholder="•••• required to sweep" />
                    <Field label="Gas Wallet Address" v={c.gas_wallet_address} onChange={(v) => update(i, "gas_wallet_address", v)} placeholder="0x..." />
                    <Field label="Gas Wallet Private Key" type="password" v={c.gas_wallet_private_key} onChange={(v) => update(i, "gas_wallet_private_key", v)} placeholder="•••• funds gas for token sweeps" />
                    <Field label="Cold Wallet (sweep destination)" v={c.cold_wallet_address} onChange={(v) => update(i, "cold_wallet_address", v)} placeholder="0x..." />
                    <Field label="Min Gas Reserve" v={c.min_gas_reserve} onChange={(v) => update(i, "min_gas_reserve", v)} placeholder="0" />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => save(c)} className="gap-2"><Save className="h-4 w-4" /> Save chain</Button>
                  </div>

                  <div className="border-t border-border pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-sm flex items-center gap-2"><Coins className="h-4 w-4" /> Tokens</h4>
                      <Button size="sm" variant="outline" onClick={() => addToken(c.chain_key)} className="gap-1"><Plus className="h-3 w-3" /> Add token</Button>
                    </div>
                    {(tokens[c.chain_key] || []).length === 0 ? (
                      <p className="text-xs text-muted-foreground">No tokens configured</p>
                    ) : (
                      <div className="space-y-2">
                        {tokens[c.chain_key].map((tk) => (
                          <div key={tk.id} className="grid grid-cols-12 gap-2 items-center">
                            <Input className="col-span-2" placeholder="Symbol" defaultValue={tk.symbol} onBlur={(e) => updateToken(tk.id!, { symbol: e.target.value })} />
                            <Input className="col-span-6" placeholder="Contract address" defaultValue={tk.contract_address} onBlur={(e) => updateToken(tk.id!, { contract_address: e.target.value })} />
                            <Input className="col-span-2" type="number" placeholder="Decimals" defaultValue={tk.decimals} onBlur={(e) => updateToken(tk.id!, { decimals: parseInt(e.target.value) || 0 })} />
                            <Switch className="col-span-1" checked={tk.is_active} onCheckedChange={(v) => updateToken(tk.id!, { is_active: v })} />
                            <Button className="col-span-1" variant="ghost" size="icon" onClick={() => deleteToken(tk.id!)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {chains.length === 0 && !loading && <p className="text-sm text-muted-foreground">No chains seeded.</p>}
      </div>
    </DashboardLayout>
  );
}

function Field({ label, v, onChange, placeholder, type = "text" }: { label: string; v: any; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={v ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1 font-mono text-xs" />
    </div>
  );
}