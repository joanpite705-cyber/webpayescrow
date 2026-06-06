import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, ArrowLeft, ShieldCheck, Star, Clock, Package, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function ListingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [l, setL] = useState<any>(null);
  const [seller, setSeller] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("account_listings").select("*").eq("id", id).maybeSingle();
      setL(data);
      if (data) {
        const [{ data: p }, { data: s }, { data: r }] = await Promise.all([
          supabase.from("profiles").select("id,telegram_username,display_name,verified_seller,total_sales").eq("id", data.seller_id).maybeSingle(),
          supabase.rpc("get_seller_stats", { _seller_id: data.seller_id }),
          supabase.from("listing_reviews").select("*").eq("listing_id", data.id).order("created_at", { ascending: false }).limit(10),
        ]);
        setSeller(p);
        setStats(Array.isArray(s) ? s[0] : s);
        setReviews(r || []);
      }
    })();
  }, [id]);

  const buy = async () => {
    if (!user) { navigate("/login?next=/marketplace/" + id); return; }
    if (user.id === l.seller_id) { toast.error("You can't buy your own listing"); return; }
    setBuying(true);
    try {
      // reserve a stock unit
      const { data: stock, error: sErr } = await supabase
        .from("listing_stock").select("*").eq("listing_id", l.id).eq("status", "available").limit(1).maybeSingle();
      if (sErr || !stock) throw new Error("Out of stock");

      await supabase.from("listing_stock").update({ status: "reserved" }).eq("id", stock.id);

      const { data: esc, error: eErr } = await supabase.from("escrows").insert({
        title: `[Marketplace] ${l.title}`,
        description: l.description || l.platform,
        amount: l.price,
        crypto_type: l.crypto_type,
        chain_key: l.chain_key,
        buyer_id: user.id,
        buyer_email: user.email,
        seller_id: l.seller_id,
        created_by: user.id,
        status: "pending",
        fee_amount: 0,
      }).select().single();
      if (eErr) throw eErr;

      const { error: pErr } = await supabase.from("listing_purchases").insert({
        listing_id: l.id,
        stock_id: stock.id,
        buyer_id: user.id,
        seller_id: l.seller_id,
        escrow_id: esc.id,
        price: l.price,
        crypto_type: l.crypto_type,
        warranty_expires_at: new Date(Date.now() + (l.warranty_hours || 0) * 3600_000).toISOString(),
      });
      if (pErr) throw pErr;

      toast.success("Purchase started! Complete payment in the escrow.");
      navigate(`/dashboard/escrows/${esc.id}`);
    } catch (e: any) {
      toast.error(e.message || "Purchase failed");
    } finally {
      setBuying(false);
    }
  };

  if (!l) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/marketplace" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Marketplace
          </Link>
          <Link to="/" className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /><span className="font-bold gradient-text">EscrowBot</span></Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {l.images?.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {l.images.map((src: string, i: number) => (
                <img key={i} src={src} alt="" className="w-full rounded-lg border border-border" />
              ))}
            </div>
          )}
          <div className="glass-card p-6">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <Badge variant="secondary">{l.platform}</Badge>
                <h1 className="text-2xl font-bold mt-2">{l.title}</h1>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-primary">{l.price} {l.crypto_type}</div>
                <div className="text-xs text-muted-foreground mt-1">{l.stock_count} available</div>
              </div>
            </div>
            <p className="text-muted-foreground whitespace-pre-wrap">{l.description}</p>
            <div className="grid grid-cols-3 gap-3 mt-5">
              <div className="rounded-lg bg-secondary/50 p-3 text-center">
                <Shield className="h-4 w-4 mx-auto text-emerald-400 mb-1" />
                <div className="text-xs text-muted-foreground">Warranty</div>
                <div className="text-sm font-semibold">{l.warranty_hours}h</div>
              </div>
              <div className="rounded-lg bg-secondary/50 p-3 text-center">
                <Package className="h-4 w-4 mx-auto text-primary mb-1" />
                <div className="text-xs text-muted-foreground">Delivery</div>
                <div className="text-sm font-semibold capitalize">{l.delivery_type}</div>
              </div>
              <div className="rounded-lg bg-secondary/50 p-3 text-center">
                <Clock className="h-4 w-4 mx-auto text-amber-400 mb-1" />
                <div className="text-xs text-muted-foreground">Sold</div>
                <div className="text-sm font-semibold">{l.sold_count}</div>
              </div>
            </div>
          </div>

          {reviews.length > 0 && (
            <div className="glass-card p-6">
              <h2 className="font-semibold mb-3">Buyer reviews</h2>
              <div className="space-y-3">
                {reviews.map((r) => (
                  <div key={r.id} className="border-b border-border pb-3 last:border-0">
                    <div className="flex items-center gap-1 mb-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3 w-3 ${i < r.rating ? "text-amber-400 fill-amber-400" : "text-muted"}`} />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">{r.comment || "Great seller"}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="glass-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                {seller?.telegram_username?.[0]?.toUpperCase() || "S"}
              </div>
              <div>
                <div className="font-semibold flex items-center gap-1">
                  {seller?.display_name || seller?.telegram_username || "Seller"}
                  {seller?.verified_seller && <ShieldCheck className="h-4 w-4 text-emerald-400" />}
                </div>
                <div className="text-xs text-muted-foreground">{stats?.total_sales || 0} sales · ★ {stats?.avg_rating || "—"}</div>
              </div>
            </div>
            <Button className="w-full" disabled={buying || l.stock_count === 0} onClick={buy}>
              {l.stock_count === 0 ? "Sold out" : buying ? "Creating escrow…" : `Buy for ${l.price} ${l.crypto_type}`}
            </Button>
            <p className="text-[11px] text-muted-foreground mt-3 flex gap-1">
              <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
              Payment is held in escrow. Credentials are delivered automatically once payment is confirmed.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}