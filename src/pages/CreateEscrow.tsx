import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Copy, Wallet } from "lucide-react";

export default function CreateEscrow() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [wallets, setWallets] = useState<any[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    amount: "",
    crypto_type: "USDT",
    role: "buyer" as "buyer" | "seller",
    counterpart: "",
    seller_wallet_address: "",
    seller_network: "",
  });

  useEffect(() => {
    fetchWallets();
  }, []);

  const fetchWallets = async () => {
    const { data } = await supabase.from("crypto_wallets").select("*").eq("is_active", true);
    setWallets(data || []);
  };

  // Get platform wallets matching selected crypto (for buyer to see)
  const matchingWallets = wallets.filter((w) => {
    if (form.crypto_type === "USDT") return w.crypto_name === "USDT" && w.network === "TRC20";
    if (form.crypto_type === "USDT_ERC20") return w.crypto_name === "USDT" && w.network === "ERC20";
    return w.crypto_name === form.crypto_type;
  });

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    toast.success("Address copied!");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const { data: counterpartProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_username", form.counterpart.replace("@", ""))
      .single();

    if (!counterpartProfile) {
      toast.error("Counterpart not found. Make sure they have an account.");
      setLoading(false);
      return;
    }

    const escrowData: any = {
      title: form.title,
      description: form.description,
      amount: parseFloat(form.amount),
      crypto_type: form.crypto_type,
      created_by: user.id,
      status: "pending" as const,
    };

    if (form.role === "buyer") {
      escrowData.buyer_id = user.id;
      escrowData.seller_id = counterpartProfile.id;
    } else {
      escrowData.seller_id = user.id;
      escrowData.buyer_id = counterpartProfile.id;
    }

    const { data: escrowResult, error } = await supabase.from("escrows").insert(escrowData).select().single();
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Escrow created!");
      navigate(`/dashboard/escrows/${escrowResult.id}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold mb-2">Create Escrow</h1>
        <p className="text-muted-foreground mb-8">Set up a new trade with another user.</p>

        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>I am the</Label>
                <Select value={form.role} onValueChange={(v: "buyer" | "seller") => setForm({ ...form, role: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buyer">Buyer</SelectItem>
                    <SelectItem value="seller">Seller</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Counterpart Username</Label>
                <Input value={form.counterpart} onChange={(e) => setForm({ ...form, counterpart: e.target.value })}
                  placeholder="@username" required className="mt-1.5" />
              </div>
            </div>

            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Netflix Account" required className="mt-1.5" />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe what's being sold..." className="mt-1.5" rows={3} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Amount</Label>
                <Input type="number" step="0.00000001" value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00" required className="mt-1.5" />
              </div>
              <div>
                <Label>Crypto</Label>
                <Select value={form.crypto_type} onValueChange={(v) => setForm({ ...form, crypto_type: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USDT">USDT (TRC20)</SelectItem>
                    <SelectItem value="USDT_ERC20">USDT (ERC20)</SelectItem>
                    <SelectItem value="BTC">Bitcoin</SelectItem>
                    <SelectItem value="ETH">Ethereum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* BUYER: Show platform wallet addresses to send payment to */}
            {form.role === "buyer" && matchingWallets.length > 0 && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                  <Wallet className="h-4 w-4 text-primary" /> Payment Wallet{matchingWallets.length > 1 ? 's' : ''}
                </h4>
                <p className="text-xs text-muted-foreground mb-3">Send your payment to one of these addresses after the escrow is created:</p>
                {matchingWallets.map((w) => (
                  <div key={w.id} className="flex items-center justify-between bg-background/50 rounded-md p-3 mb-2 last:mb-0">
                    <div>
                      <p className="text-xs text-muted-foreground">{w.crypto_name} — {w.network}</p>
                      <p className="font-mono text-xs mt-1 break-all">{w.wallet_address}</p>
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => copyAddress(w.wallet_address)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* SELLER: Enter their receive wallet */}
            {form.role === "seller" && (
              <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                  <Wallet className="h-4 w-4 text-accent" /> Your Receiving Wallet
                </h4>
                <p className="text-xs text-muted-foreground mb-3">Where you want to receive payment after the trade completes:</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <Label className="text-xs">Network</Label>
                    <Select value={form.seller_network} onValueChange={(v) => setForm({ ...form, seller_network: v })}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select network" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TRC20">TRC20</SelectItem>
                        <SelectItem value="ERC20">ERC20</SelectItem>
                        <SelectItem value="Bitcoin">Bitcoin</SelectItem>
                        <SelectItem value="Ethereum">Ethereum</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Wallet Address</Label>
                    <Input value={form.seller_wallet_address}
                      onChange={(e) => setForm({ ...form, seller_wallet_address: e.target.value })}
                      placeholder="Your wallet address" className="mt-1" />
                  </div>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating..." : "Create Escrow"}
            </Button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
