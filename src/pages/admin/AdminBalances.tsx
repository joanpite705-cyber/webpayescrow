import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Coins, Plus, Minus, History } from "lucide-react";

export default function AdminBalances() {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [form, setForm] = useState({ userId: "", crypto: "USDT", amount: "", note: "", direction: "credit" as "credit" | "debit" });
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [u, b, l] = await Promise.all([
      supabase.from("profiles").select("id, telegram_username, display_name").order("created_at", { ascending: false }),
      supabase.from("user_balances").select("*"),
      supabase.from("balance_ledger").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setUsers(u.data || []);
    setBalances(b.data || []);
    setLedger(l.data || []);
  };

  const adjust = async () => {
    if (!form.userId || !form.amount || !user) {
      toast.error("Select user and amount");
      return;
    }
    setLoading(true);
    const amt = parseFloat(form.amount);
    if (isNaN(amt) || amt <= 0) { toast.error("Invalid amount"); setLoading(false); return; }
    const delta = form.direction === "credit" ? amt : -amt;

    // Upsert balance
    const existing = balances.find((b) => b.user_id === form.userId && b.crypto_type === form.crypto);
    const newBal = (existing?.balance || 0) + delta;
    if (newBal < 0) { toast.error("Insufficient balance"); setLoading(false); return; }

    if (existing) {
      await supabase.from("user_balances").update({ balance: newBal }).eq("id", existing.id);
    } else {
      await supabase.from("user_balances").insert({ user_id: form.userId, crypto_type: form.crypto, balance: newBal });
    }

    await supabase.from("balance_ledger").insert({
      user_id: form.userId,
      crypto_type: form.crypto,
      amount: delta,
      type: "admin_adjust",
      note: form.note || `Admin ${form.direction}`,
      created_by: user.id,
    });

    toast.success("Balance updated");
    setForm({ ...form, amount: "", note: "" });
    setLoading(false);
    fetchAll();
  };

  const userMap: Record<string, any> = {};
  users.forEach((u) => (userMap[u.id] = u));

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-8 flex items-center gap-2">
        <Coins className="h-6 w-6 text-primary" /> Balance Management
      </h1>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Adjust form */}
        <div className="glass-card p-6">
          <h2 className="font-semibold mb-4">Adjust User Balance</h2>
          <div className="space-y-3">
            <div>
              <Label>User</Label>
              <Select value={form.userId} onValueChange={(v) => setForm({ ...form, userId: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select user" /></SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      @{u.telegram_username || u.id.slice(0, 8)} {u.display_name ? `— ${u.display_name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Crypto</Label>
                <Select value={form.crypto} onValueChange={(v) => setForm({ ...form, crypto: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USDT">USDT (TRC20)</SelectItem>
                    <SelectItem value="USDT_ERC20">USDT (ERC20)</SelectItem>
                    <SelectItem value="BTC">BTC</SelectItem>
                    <SelectItem value="ETH">ETH</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Direction</Label>
                <Select value={form.direction} onValueChange={(v: "credit" | "debit") => setForm({ ...form, direction: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">+ Credit</SelectItem>
                    <SelectItem value="debit">− Debit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Amount</Label>
              <Input type="number" step="0.00000001" value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <Label>Note</Label>
              <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Reason / reference" className="mt-1.5" />
            </div>
            <Button onClick={adjust} disabled={loading} className="w-full gap-2">
              {form.direction === "credit" ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
              {loading ? "Saving..." : "Apply Adjustment"}
            </Button>
          </div>
        </div>

        {/* Current balances */}
        <div className="glass-card p-6">
          <h2 className="font-semibold mb-4">All Balances</h2>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {balances.length === 0 && <p className="text-sm text-muted-foreground">No balances yet.</p>}
            {balances.map((b) => (
              <div key={b.id} className="flex items-center justify-between text-sm border-b border-border/50 pb-2">
                <div>
                  <p className="font-medium">@{userMap[b.user_id]?.telegram_username || b.user_id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">{b.crypto_type}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono">{b.balance}</p>
                  {b.locked_balance > 0 && <p className="text-xs text-warning">🔒 {b.locked_balance}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ledger */}
      <div className="glass-card p-6 mt-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2"><History className="h-4 w-4" /> Recent Activity</h2>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {ledger.map((l) => (
            <div key={l.id} className="flex items-center justify-between text-xs border-b border-border/30 pb-2">
              <div>
                <span className="font-medium">@{userMap[l.user_id]?.telegram_username || l.user_id.slice(0, 8)}</span>
                <span className="text-muted-foreground ml-2">{l.type}</span>
                {l.note && <p className="text-muted-foreground text-[11px]">{l.note}</p>}
              </div>
              <div className="text-right">
                <span className={`font-mono ${l.amount >= 0 ? "text-emerald-400" : "text-destructive"}`}>
                  {l.amount >= 0 ? "+" : ""}{l.amount} {l.crypto_type}
                </span>
                <p className="text-[10px] text-muted-foreground">{new Date(l.created_at).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
