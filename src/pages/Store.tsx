import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Search, ArrowLeft, Package } from "lucide-react";

type Product = {
  id: string; title: string; description: string | null; category: string;
  price: number; currency: string; image_url: string | null;
  delivery_type: string; stock: number; unlimited_stock: boolean;
};

export default function Store() {
  const [items, setItems] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.rpc("get_store_products").then(({ data }) => {
      setItems((data as Product[]) || []);
      setLoading(false);
    });
  }, []);

  const cats = ["all", ...Array.from(new Set(items.map((i) => i.category)))];
  const filtered = items.filter(
    (i) =>
      (cat === "all" || i.category === cat) &&
      (!q || i.title.toLowerCase().includes(q.toLowerCase()) || (i.description || "").toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-semibold">EscrowBot Store</span>
          </Link>
          <Link to="/marketplace"><Button variant="outline" size="sm">Marketplace</Button></Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Link>
        <h1 className="text-2xl font-semibold mb-1">Digital Goods Store</h1>
        <p className="text-sm text-muted-foreground mb-6">Official products sold by the platform. Pay with crypto — delivery after confirmation.</p>

        <div className="relative mb-4">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" className="pl-9" />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`px-3 py-1.5 rounded-md text-sm capitalize whitespace-nowrap border transition ${
                cat === c ? "bg-secondary text-foreground border-border" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-16 text-center text-muted-foreground text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm">No products listed yet.</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <Link key={p.id} to={`/store/${p.id}`} className="panel p-4 hover:border-primary/40 transition block">
                {p.image_url ? (
                  <div className="aspect-video mb-3 overflow-hidden rounded border border-border bg-secondary">
                    <img src={p.image_url} alt={p.title} loading="lazy" className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="aspect-video mb-3 flex items-center justify-center rounded border border-border bg-secondary">
                    <Package className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <Badge variant="secondary" className="mb-2 capitalize">{p.category}</Badge>
                <h2 className="font-medium line-clamp-1">{p.title}</h2>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1 mb-3">{p.description || "—"}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">{p.price} {p.currency}</span>
                  <span className="text-xs text-muted-foreground">
                    {p.unlimited_stock ? "In stock" : `${p.stock} left`}
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
