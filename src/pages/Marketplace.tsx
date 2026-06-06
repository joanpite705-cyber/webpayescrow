import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Shield, Search, ShoppingBag, Star, Zap, ArrowLeft } from "lucide-react";

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "streaming", label: "Streaming" },
  { key: "social", label: "Social Media" },
  { key: "gaming", label: "Gaming" },
  { key: "email", label: "Email / Productivity" },
  { key: "other", label: "Other" },
];

export default function Marketplace() {
  const [listings, setListings] = useState<any[]>([]);
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    let qb = supabase.from("account_listings").select("*").eq("is_active", true).gt("stock_count", 0).order("created_at", { ascending: false });
    if (cat !== "all") qb = qb.eq("category", cat);
    qb.then(({ data }) => { setListings(data || []); setLoading(false); });
  }, [cat]);

  const filtered = listings.filter((l) => !q || l.title.toLowerCase().includes(q.toLowerCase()) || l.platform.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-bold gradient-text">EscrowBot Market</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/dashboard"><Button variant="ghost" size="sm">Dashboard</Button></Link>
            <Link to="/dashboard/seller"><Button size="sm"><ShoppingBag className="h-4 w-4 mr-1" />Sell</Button></Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Link>
        <h1 className="text-3xl font-bold mb-2">Account Marketplace</h1>
        <p className="text-muted-foreground mb-6">Buy verified accounts with escrow protection & warranty.</p>

        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Netflix, Spotify, Steam..." className="pl-9" />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          {CATEGORIES.map((c) => (
            <button key={c.key} onClick={() => setCat(c.key)}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap border transition ${
                cat === c.key ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"
              }`}>
              {c.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground py-12">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">No listings found.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((l) => (
              <Link key={l.id} to={`/marketplace/${l.id}`} className="glass-card p-5 hover:border-primary/50 transition group">
                {l.images?.[0] && (
                  <div className="aspect-video rounded-lg overflow-hidden bg-secondary mb-3">
                    <img src={l.images[0]} alt={l.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                  </div>
                )}
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="secondary" className="text-xs">{l.platform}</Badge>
                  {l.warranty_hours > 0 && (
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1"><Shield className="h-3 w-3" />{l.warranty_hours}h warranty</span>
                  )}
                </div>
                <h3 className="font-semibold mb-1 line-clamp-1">{l.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{l.description || "—"}</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-primary">{l.price} {l.crypto_type}</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Zap className="h-3 w-3" />{l.stock_count} in stock
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}