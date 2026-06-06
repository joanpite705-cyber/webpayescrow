import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Eye, ShieldAlert, ShieldCheck, Copy, Star } from "lucide-react";
import { toast } from "sonner";

export default function MyPurchases() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("listing_purchases")
      .select("*, listing:account_listings(title,platform,warranty_hours,images), escrow:escrows(status,amount,crypto_type)")
      .eq("buyer_id", user.id).order("created_at", { ascending: false });
    setRows(data || []);
  };
  useEffect(() => { load(); }, [user]);

  const reveal = async (p: any) => {
    if (!["paid", "released", "completed"].includes(p.escrow?.status)) {
      toast.error("Payment not yet confirmed");
      return;
    }
    const { data: stock } = await supabase.from("listing_stock").select("credentials,status").eq("id", p.stock_id).maybeSingle();
    if (!stock) { toast.error("Credentials not available"); return; }
    setRevealed({ ...revealed, [p.id]: stock.credentials });
    if (!p.delivered_at) {
      await Promise.all([
        supabase.from("listing_stock").update({ status: "sold", delivered_at: new Date().toISOString(), purchase_id: p.id }).eq("id", p.stock_id),
        supabase.from("listing_purchases").update({ status: "delivered", delivered_at: new Date().toISOString() }).eq("id", p.id),
      ]);
      load();
    }
  };

  const claimDead = async (p: any) => {
    if (!confirm("Mark this account as dead/not working? Seller will be notified to replace or refund.")) return;
    await Promise.all([
      supabase.from("listing_stock").update({ status: "dead" }).eq("id", p.stock_id),
      supabase.from("listing_purchases").update({ status: "claimed_dead" }).eq("id", p.id),
    ]);
    toast.success("Marked as dead. Seller has been notified.");
    load();
  };

  const complete = async (p: any) => {
    await supabase.from("listing_purchases").update({ status: "completed" }).eq("id", p.id);
    toast.success("Purchase confirmed!");
    load();
  };

  const submitReview = async (p: any) => {
    if (!user) return;
    const { error } = await supabase.from("listing_reviews").insert({
      purchase_id: p.id, listing_id: p.listing_id, buyer_id: user.id, seller_id: p.seller_id, rating, comment,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Review posted");
    setReviewing(null); setComment(""); setRating(5); load();
  };

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-2">My Purchases</h1>
      <p className="text-sm text-muted-foreground mb-6">Reveal credentials once payment is confirmed. Warranty applies for the listed window.</p>

      {rows.length === 0 ? (
        <div className="glass-card p-10 text-center text-muted-foreground">
          You haven't purchased anything yet. <Link to="/marketplace" className="text-primary underline">Browse marketplace</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((p) => {
            const paid = ["paid", "released", "completed"].includes(p.escrow?.status);
            const warrantyLeft = p.warranty_expires_at ? new Date(p.warranty_expires_at).getTime() - Date.now() : 0;
            return (
              <div key={p.id} className="glass-card p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex gap-3 min-w-0 flex-1">
                    {p.listing?.images?.[0] && <img src={p.listing.images[0]} className="h-14 w-14 rounded object-cover" />}
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{p.listing?.title}</h3>
                      <p className="text-xs text-muted-foreground">{p.listing?.platform} · {p.price} {p.crypto_type}</p>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        <Badge variant="secondary" className="text-[10px]">{p.status}</Badge>
                        <Badge variant={paid ? "default" : "secondary"} className="text-[10px]">Escrow: {p.escrow?.status}</Badge>
                        {paid && warrantyLeft > 0 && (
                          <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">
                            Warranty: {Math.ceil(warrantyLeft / 3_600_000)}h left
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {paid && !revealed[p.id] && (
                      <Button size="sm" onClick={() => reveal(p)}><Eye className="h-4 w-4 mr-1" />Reveal</Button>
                    )}
                    {paid && p.status === "delivered" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => claimDead(p)}><ShieldAlert className="h-4 w-4 mr-1" />Account dead</Button>
                        <Button size="sm" variant="default" onClick={() => complete(p)}><ShieldCheck className="h-4 w-4 mr-1" />Confirm OK</Button>
                      </>
                    )}
                    {p.status === "completed" && (
                      <Button size="sm" variant="outline" onClick={() => setReviewing(reviewing === p.id ? null : p.id)}>
                        <Star className="h-4 w-4 mr-1" />Review
                      </Button>
                    )}
                    {p.escrow_id && <Link to={`/dashboard/escrows/${p.escrow_id}`}><Button size="sm" variant="ghost">Open escrow</Button></Link>}
                  </div>
                </div>

                {revealed[p.id] && (
                  <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Credentials</span>
                      <button onClick={() => { navigator.clipboard.writeText(revealed[p.id]); toast.success("Copied"); }}>
                        <Copy className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                    <pre className="text-sm font-mono mt-2 whitespace-pre-wrap break-all">{revealed[p.id]}</pre>
                  </div>
                )}

                {reviewing === p.id && (
                  <div className="mt-3 border-t border-border pt-3">
                    <div className="flex gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} onClick={() => setRating(n)}>
                          <Star className={`h-5 w-5 ${n <= rating ? "text-amber-400 fill-amber-400" : "text-muted"}`} />
                        </button>
                      ))}
                    </div>
                    <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional comment…" rows={2} />
                    <Button size="sm" className="mt-2" onClick={() => submitReview(p)}>Post review</Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}