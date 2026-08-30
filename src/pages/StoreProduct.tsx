import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Shield, ArrowLeft, Package, Coins } from "lucide-react";
import { toast } from "sonner";

type Product = {
  id: string; title: string; description: string | null; category: string;
  price: number; currency: string; image_url: string | null;
  delivery_type: string; stock: number; unlimited_stock: boolean;
};

type Wallet = { id: string; crypto_name: string; network: string; wallet_address: string };

export default function StoreProduct() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [p, setP] = useState<Product | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [walletId, setWalletId] = useState("");
  const [email, setEmail] = useState("");
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user]);

  useEffect(() => {
    (async () => {
      const [{ data: prod }, { data: w }] = await Promise.all([
        supabase.rpc("get_store_product", { _id: id as string }),
        supabase.rpc("get_payment_wallets"),
      ]);
      const item = Array.isArray(prod) ? prod[0] : prod;
      setP((item as Product) || null);
      const list = (w as Wallet[]) || [];
      setWallets(list);
      if (list[0]) setWalletId(list[0].id);
      setLoading(false);
    })();
  }, [id]);

  const checkout = async () => {
    if (!email.trim()) { toast.error("Enter your email"); return; }
    if (!walletId) { toast.error("Select a payment coin"); return; }
    setBusy(true);
    const { data, error } = await supabase.rpc("create_store_order", {
      _product_id: id as string,
      _buyer_email: email.trim(),
      _wallet_id: walletId,
      _quantity: qty,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    navigate(`/store/checkout/${data}`);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  if (!p) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
      Product not found.
      <Link to="/store"><Button variant="outline" size="sm">Back to store</Button></Link>
    </div>
  );

  const soldOut = !p.unlimited_stock && p.stock < 1;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/store" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Store
          </Link>
          <Link to="/" className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /><span className="font-semibold">EscrowBot</span></Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="panel overflow-hidden">
            {p.image_url ? (
              <img src={p.image_url} alt={p.title} className="w-full max-h-80 object-cover border-b border-border" />
            ) : (
              <div className="flex h-48 items-center justify-center border-b border-border bg-secondary">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className="p-5">
              <Badge variant="secondary" className="capitalize mb-2">{p.category}</Badge>
              <h1 className="text-xl font-semibold">{p.title}</h1>
              <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{p.description || "No description provided."}</p>
              <div className="mt-5 grid grid-cols-3 gap-3 text-center text-xs">
                <div className="rounded border border-border p-3">
                  <div className="text-muted-foreground">Delivery</div>
                  <div className="mt-1 font-medium capitalize">{p.delivery_type}</div>
                </div>
                <div className="rounded border border-border p-3">
                  <div className="text-muted-foreground">Stock</div>
                  <div className="mt-1 font-medium">{p.unlimited_stock ? "Unlimited" : p.stock}</div>
                </div>
                <div className="rounded border border-border p-3">
                  <div className="text-muted-foreground">Price</div>
                  <div className="mt-1 font-medium">{p.price} {p.currency}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="panel p-5 space-y-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-xl font-semibold">{(p.price * qty).toFixed(2)} {p.currency}</span>
            </div>

            <div>
              <Label>Quantity</Label>
              <Input type="number" min={1} value={qty} className="mt-1.5"
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))} />
            </div>

            <div>
              <Label>Email for delivery</Label>
              <Input type="email" value={email} placeholder="you@example.com" className="mt-1.5"
                onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div>
              <Label className="flex items-center gap-1"><Coins className="h-3.5 w-3.5" /> Pay with</Label>
              {wallets.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">No payment coins configured yet.</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {wallets.map((w) => (
                    <button key={w.id} onClick={() => setWalletId(w.id)}
                      className={`w-full rounded border px-3 py-2 text-left text-sm transition ${
                        walletId === w.id ? "border-primary bg-secondary" : "border-border hover:bg-secondary/60"
                      }`}>
                      <div className="font-medium">{w.crypto_name}</div>
                      <div className="text-xs text-muted-foreground">{w.network}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Button className="w-full" disabled={busy || soldOut || wallets.length === 0} onClick={checkout}>
              {soldOut ? "Sold out" : busy ? "Creating order…" : "Continue to checkout"}
            </Button>
            <p className="text-[11px] text-muted-foreground">
              You'll get a payment address and QR code on the next step. Delivery is sent to your email once payment is confirmed.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
