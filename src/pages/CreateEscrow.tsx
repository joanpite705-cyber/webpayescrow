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
import { Copy, Wallet, Info } from "lucide-react";
import { t, useLanguage } from "@/lib/i18n";

export default function CreateEscrow() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [wallets, setWallets] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [form, setForm] = useState({
    title: "", description: "", amount: "", crypto_type: "USDT",
    role: "buyer" as "buyer" | "seller", counterpart_email: "", counterpart_username: "",
    seller_wallet_address: "", seller_network: "",
  });

  useEffect(() => {
    Promise.all([
      supabase.from("crypto_wallets").select("*").eq("is_active", true),
      supabase.from("platform_settings").select("*").eq("id", 1).maybeSingle(),
    ]).then(([w, s]) => {
      setWallets(w.data || []);
      setSettings(s.data);
    });
  }, []);

  const matchingWallets = wallets.filter((w) => {
    if (form.crypto_type === "USDT") return w.crypto_name === "USDT" && w.network === "TRC20";
    if (form.crypto_type === "USDT_ERC20") return w.crypto_name === "USDT" && w.network === "ERC20";
    return w.crypto_name === form.crypto_type;
  });

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    toast.success("Address copied!");
  };

  const feeAmount = settings ? (parseFloat(form.amount || "0") * settings.fee_percentage / 100) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.counterpart_email) { toast.error("Counterpart email is required"); return; }
    setLoading(true);

    const cpEmail = form.counterpart_email.trim().toLowerCase();
    const cpUsername = form.counterpart_username.replace("@", "").trim() || null;
    // Try to find existing profile by email via auth user lookup is not available client-side;
    // we leave id null when not found — DB trigger links it on signup.
    let counterpartId: string | null = null;
    if (cpUsername) {
      const { data: byUser } = await supabase
        .from("profiles").select("id")
        .ilike("telegram_username", cpUsername).maybeSingle();
      if (byUser) counterpartId = byUser.id;
    }

    const escrowData: any = {
      title: form.title, description: form.description,
      amount: parseFloat(form.amount), crypto_type: form.crypto_type,
      created_by: user.id, status: "pending" as const,
      fee_amount: feeAmount,
      seller_wallet_address: form.role === "seller" ? form.seller_wallet_address : null,
      seller_network: form.role === "seller" ? form.seller_network : null,
    };

    if (form.role === "buyer") {
      escrowData.buyer_id = user.id;
      escrowData.buyer_email = user.email;
      escrowData.seller_id = counterpartId;
      escrowData.seller_email = cpEmail;
      escrowData.seller_username = cpUsername;
    } else {
      escrowData.seller_id = user.id;
      escrowData.seller_email = user.email;
      escrowData.buyer_id = counterpartId;
      escrowData.buyer_email = cpEmail;
      escrowData.buyer_username = cpUsername;
    }

    const { data: escrowResult, error } = await supabase.from("escrows").insert(escrowData).select().single();
    setLoading(false);
    if (error) toast.error(error.message);
    else {
      toast.success(counterpartId
        ? "Escrow created! Waiting for counterpart to accept."
        : `Escrow created! ${cpEmail} will be linked once they sign up.`);
      navigate(`/dashboard/escrows/${escrowResult.id}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold mb-2">{t("create_escrow", lang)}</h1>
        <p className="text-muted-foreground mb-8">Set up a new trade. The counterpart must accept before the trade begins.</p>

        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("i_am_the", lang)}</Label>
                <Select value={form.role} onValueChange={(v: "buyer" | "seller") => setForm({ ...form, role: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buyer">{t("buyer", lang)}</SelectItem>
                    <SelectItem value="seller">{t("seller", lang)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Counterpart email</Label>
                <Input type="email" value={form.counterpart_email}
                  onChange={(e) => setForm({ ...form, counterpart_email: e.target.value })}
                  placeholder="them@example.com" required className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label>Counterpart Telegram username (optional)</Label>
              <Input value={form.counterpart_username}
                onChange={(e) => setForm({ ...form, counterpart_username: e.target.value })}
                placeholder="@username (optional)" className="mt-1.5" />
              <p className="text-xs text-muted-foreground mt-1">Used only to notify them via the bot if they linked it.</p>
            </div>

            <div>
              <Label>{t("title", lang)}</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Netflix Account" required className="mt-1.5" />
            </div>

            <div>
              <Label>{t("description", lang)}</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe what's being sold..." className="mt-1.5" rows={3} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("amount", lang)}</Label>
                <Input type="number" step="0.00000001" value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00" required className="mt-1.5" />
              </div>
              <div>
                <Label>{t("crypto", lang)}</Label>
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

            {/* Fee info */}
            {settings && parseFloat(form.amount || "0") > 0 && (
              <div className="rounded-lg border border-muted p-3 flex items-center gap-2 text-sm">
                <Info className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t("fee", lang)}: <strong className="text-foreground">{feeAmount.toFixed(8)} {form.crypto_type}</strong> ({settings.fee_percentage}%)</span>
              </div>
            )}

            {/* BUYER: Show platform wallet addresses */}
            {form.role === "buyer" && matchingWallets.length > 0 && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                  <Wallet className="h-4 w-4 text-primary" /> Payment Wallet{matchingWallets.length > 1 ? 's' : ''}
                </h4>
                <p className="text-xs text-muted-foreground mb-3">Send your payment to this address after the escrow is accepted:</p>
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

            {/* SELLER: Enter receive wallet */}
            {form.role === "seller" && (
              <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                  <Wallet className="h-4 w-4 text-accent" /> Your Receiving Wallet
                </h4>
                <p className="text-xs text-muted-foreground mb-3">Where you want to receive payment after trade completes:</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">{t("network", lang)}</Label>
                    <Select value={form.seller_network} onValueChange={(v) => setForm({ ...form, seller_network: v })}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TRC20">TRC20</SelectItem>
                        <SelectItem value="ERC20">ERC20</SelectItem>
                        <SelectItem value="Bitcoin">Bitcoin</SelectItem>
                        <SelectItem value="Ethereum">Ethereum</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">{t("wallet_address", lang)}</Label>
                    <Input value={form.seller_wallet_address}
                      onChange={(e) => setForm({ ...form, seller_wallet_address: e.target.value })}
                      placeholder="Your wallet address" className="mt-1" />
                  </div>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("creating", lang) : t("create_escrow", lang)}
            </Button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
