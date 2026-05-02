import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Wallet, RefreshCw, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";

function fmt(b: string, decimals: number) {
  try {
    const n = BigInt(b);
    const base = 10n ** BigInt(decimals);
    const whole = n / base;
    const frac = (n % base).toString().padStart(decimals, "0").slice(0, 4).replace(/0+$/, "");
    return frac ? `${whole}.${frac}` : `${whole}`;
  } catch { return "0"; }
}

export default function BalanceCard() {
  const { user } = useAuth();
  const { address, isConnected } = useAccount();
  const [internal, setInternal] = useState<any[]>([]);
  const [chainBal, setChainBal] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadInternal = async () => {
    if (!user) return;
    const { data } = await (supabase as any).from("user_balances").select("*").eq("user_id", user.id);
    setInternal(data || []);
  };

  const loadOnchain = async () => {
    if (!isConnected || !address) { setChainBal([]); return; }
    setLoading(true);
    // Fetch active chains, ask edge fn for balances on each EVM chain
    const { data: chains } = await (supabase as any).rpc("get_public_chains");
    const evmChains = (chains || []).filter((c: any) => c.family === "evm");
    const addresses = evmChains.map((c: any) => ({ chain_key: c.chain_key, address }));
    if (addresses.length === 0) { setLoading(false); return; }
    const { data, error } = await supabase.functions.invoke("chain-balances", { body: { addresses } });
    if (!error) setChainBal(((data as any)?.balances) || []);
    setLoading(false);
  };

  useEffect(() => { loadInternal(); }, [user]);
  useEffect(() => { loadOnchain(); }, [address, isConnected]);

  return (
    <div className="glass-card p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Balances</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={() => { loadInternal(); loadOnchain(); }} disabled={loading} className="gap-1">
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Platform balance</p>
          {internal.length === 0 ? (
            <p className="text-sm text-muted-foreground">No platform balance yet</p>
          ) : (
            <div className="space-y-1.5">
              {internal.map((b) => (
                <div key={b.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{b.crypto_type}</span>
                  <span className="font-mono">{Number(b.balance).toFixed(4)}{Number(b.locked_balance) > 0 && <span className="text-xs text-muted-foreground ml-2">(locked: {Number(b.locked_balance).toFixed(4)})</span>}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1"><Wallet className="h-3 w-3" /> Connected wallet</p>
          {!isConnected ? (
            <p className="text-sm text-muted-foreground">Connect a wallet to see on-chain balances.</p>
          ) : chainBal.length === 0 ? (
            <p className="text-sm text-muted-foreground">{loading ? "Loading…" : "No balances detected"}</p>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {chainBal.filter((b) => b.balance !== "0").map((b, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span><span className="text-xs text-muted-foreground uppercase">{b.chain_key}</span> · <span className="font-medium">{b.symbol}</span></span>
                  <span className="font-mono">{fmt(b.balance, b.decimals)}</span>
                </div>
              ))}
              {chainBal.filter((b) => b.balance !== "0").length === 0 && <p className="text-xs text-muted-foreground">No tokens detected on configured chains</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}