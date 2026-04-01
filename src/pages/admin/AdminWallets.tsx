import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Wallet, Pencil, X, Save } from "lucide-react";

export default function AdminWallets() {
  const [wallets, setWallets] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ crypto_name: "", network: "", wallet_address: "" });
  const [editForm, setEditForm] = useState({ crypto_name: "", network: "", wallet_address: "" });

  useEffect(() => { fetchWallets(); }, []);

  const fetchWallets = async () => {
    const { data } = await supabase.from("crypto_wallets").select("*").order("created_at");
    setWallets(data || []);
  };

  const addWallet = async () => {
    if (!form.crypto_name || !form.wallet_address || !form.network) {
      toast.error("All fields required");
      return;
    }
    const { error } = await supabase.from("crypto_wallets").insert(form);
    if (error) toast.error(error.message);
    else { toast.success("Wallet added"); setShowAdd(false); setForm({ crypto_name: "", network: "", wallet_address: "" }); fetchWallets(); }
  };

  const startEdit = (w: any) => {
    setEditingId(w.id);
    setEditForm({ crypto_name: w.crypto_name, network: w.network, wallet_address: w.wallet_address });
  };

  const saveEdit = async (id: string) => {
    if (!editForm.crypto_name || !editForm.wallet_address || !editForm.network) {
      toast.error("All fields required");
      return;
    }
    const { error } = await supabase.from("crypto_wallets").update(editForm).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Wallet updated"); setEditingId(null); fetchWallets(); }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("crypto_wallets").update({ is_active: !current }).eq("id", id);
    fetchWallets();
  };

  const deleteWallet = async (id: string) => {
    await supabase.from("crypto_wallets").delete().eq("id", id);
    toast.success("Wallet deleted");
    fetchWallets();
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Crypto Wallets</h1>
        <Button onClick={() => setShowAdd(!showAdd)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Wallet
        </Button>
      </div>

      {showAdd && (
        <div className="glass-card p-6 mb-6">
          <h3 className="font-semibold mb-4">Add New Wallet</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <Label>Crypto Name</Label>
              <Input value={form.crypto_name} onChange={(e) => setForm({ ...form, crypto_name: e.target.value })}
                placeholder="e.g. USDT" className="mt-1.5" />
            </div>
            <div>
              <Label>Network</Label>
              <Input value={form.network} onChange={(e) => setForm({ ...form, network: e.target.value })}
                placeholder="e.g. TRC20" className="mt-1.5" />
            </div>
            <div>
              <Label>Wallet Address</Label>
              <Input value={form.wallet_address} onChange={(e) => setForm({ ...form, wallet_address: e.target.value })}
                placeholder="0x..." className="mt-1.5" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={addWallet}>Save Wallet</Button>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="glass-card">
        {wallets.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            <Wallet className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No wallets configured yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {wallets.map((w) => (
              <div key={w.id} className="p-4">
                {editingId === w.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">Crypto Name</Label>
                        <Input value={editForm.crypto_name} onChange={(e) => setEditForm({ ...editForm, crypto_name: e.target.value })} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">Network</Label>
                        <Input value={editForm.network} onChange={(e) => setEditForm({ ...editForm, network: e.target.value })} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">Wallet Address</Label>
                        <Input value={editForm.wallet_address} onChange={(e) => setEditForm({ ...editForm, wallet_address: e.target.value })} className="mt-1" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveEdit(w.id)} className="gap-1">
                        <Save className="h-3 w-3" /> Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="gap-1">
                        <X className="h-3 w-3" /> Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{w.crypto_name} <span className="text-muted-foreground text-sm">({w.network})</span></p>
                      <p className="text-xs text-muted-foreground font-mono mt-1 break-all">{w.wallet_address}</p>
                      <p className={`text-xs mt-1 ${w.is_active ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                        {w.is_active ? '● Active' : '○ Inactive'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch checked={w.is_active} onCheckedChange={() => toggleActive(w.id, w.is_active)} />
                      <Button variant="ghost" size="icon" onClick={() => startEdit(w)} className="text-muted-foreground hover:text-foreground">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteWallet(w.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
