import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, Trash2, Upload, Image as ImageIcon, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const CATS = ["streaming", "social", "gaming", "email", "other"];

export default function SellerHub() {
  const { user } = useAuth();
  const [listings, setListings] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState<string | null>(null);
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [stockText, setStockText] = useState("");
  const [imgUploading, setImgUploading] = useState(false);
  const [form, setForm] = useState<any>({
    category: "streaming", platform: "", title: "", description: "", price: "",
    crypto_type: "USDT", warranty_hours: 24, delivery_type: "auto", auto_replace: true, images: [],
  });

  const load = () => {
    if (!user) return;
    supabase.from("account_listings").select("*").eq("seller_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setListings(data || []));
  };
  useEffect(load, [user]);

  const loadStock = async (listingId: string) => {
    const { data } = await supabase.from("listing_stock").select("*").eq("listing_id", listingId).order("created_at", { ascending: false });
    setStockItems(data || []);
  };

  const onImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file || !user) return;
    setImgUploading(true);
    const path = `${user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("listing-images").upload(path, file);
    if (error) { toast.error(error.message); setImgUploading(false); return; }
    const { data } = await supabase.storage.from("listing-images").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
    if (data?.signedUrl) setForm({ ...form, images: [...form.images, data.signedUrl] });
    setImgUploading(false);
  };

  const createListing = async () => {
    if (!user) return;
    if (!form.title || !form.price || !form.platform) { toast.error("Fill title, platform & price"); return; }
    const { error } = await supabase.from("account_listings").insert({
      ...form, seller_id: user.id, price: parseFloat(form.price), warranty_hours: parseInt(form.warranty_hours),
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Listing created! Add stock to start selling.");
    setOpen(false); load();
    setForm({ category: "streaming", platform: "", title: "", description: "", price: "", crypto_type: "USDT", warranty_hours: 24, delivery_type: "auto", auto_replace: true, images: [] });
  };

  const addStock = async (listingId: string) => {
    if (!user || !stockText.trim()) return;
    const lines = stockText.split("\n").map((l) => l.trim()).filter(Boolean);
    const rows = lines.map((credentials) => ({ listing_id: listingId, seller_id: user.id, credentials }));
    const { error } = await supabase.from("listing_stock").insert(rows);
    if (error) { toast.error(error.message); return; }
    toast.success(`${rows.length} unit(s) added`);
    setStockText(""); loadStock(listingId); load();
  };

  const deleteStock = async (id: string, listingId: string) => {
    await supabase.from("listing_stock").delete().eq("id", id);
    loadStock(listingId); load();
  };

  const toggleActive = async (l: any) => {
    await supabase.from("account_listings").update({ is_active: !l.is_active }).eq("id", l.id);
    load();
  };

  const removeListing = async (id: string) => {
    if (!confirm("Delete this listing and all its stock?")) return;
    await supabase.from("account_listings").delete().eq("id", id);
    load();
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Seller Hub</h1>
          <p className="text-sm text-muted-foreground">Manage your account listings & stock.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />New Listing</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Listing</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Platform</Label>
                  <Input value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} placeholder="Netflix" className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Netflix Premium 4K - 30 days" className="mt-1" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="mt-1" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Price</Label>
                  <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Crypto</Label>
                  <Select value={form.crypto_type} onValueChange={(v) => setForm({ ...form, crypto_type: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USDT">USDT</SelectItem>
                      <SelectItem value="BTC">BTC</SelectItem>
                      <SelectItem value="ETH">ETH</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Warranty (hrs)</Label>
                  <Input type="number" value={form.warranty_hours} onChange={(e) => setForm({ ...form, warranty_hours: e.target.value })} className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Screenshots</Label>
                <div className="flex items-center gap-2 mt-1">
                  <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-border cursor-pointer hover:bg-secondary text-sm">
                    <Upload className="h-4 w-4" /> {imgUploading ? "Uploading…" : "Add image"}
                    <input type="file" accept="image/*" hidden onChange={onImage} />
                  </label>
                  <span className="text-xs text-muted-foreground">{form.images.length} uploaded</span>
                </div>
                {form.images.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {form.images.map((src: string, i: number) => (
                      <img key={i} src={src} className="rounded border border-border aspect-square object-cover" />
                    ))}
                  </div>
                )}
              </div>
              <Button className="w-full" onClick={createListing}>Create Listing</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {listings.length === 0 ? (
        <div className="glass-card p-12 text-center text-muted-foreground">
          <Package className="h-10 w-10 mx-auto mb-3 opacity-50" />
          No listings yet. Click "New Listing" to start selling.
        </div>
      ) : (
        <div className="grid gap-3">
          {listings.map((l) => (
            <div key={l.id} className="glass-card p-4 flex items-center gap-4">
              {l.images?.[0]
                ? <img src={l.images[0]} className="h-16 w-16 rounded object-cover" />
                : <div className="h-16 w-16 rounded bg-secondary flex items-center justify-center"><ImageIcon className="h-6 w-6 text-muted-foreground" /></div>}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold truncate">{l.title}</h3>
                  <Badge variant={l.is_active ? "default" : "secondary"} className="text-[10px]">{l.is_active ? "Active" : "Paused"}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{l.platform} · {l.price} {l.crypto_type} · {l.stock_count} in stock · {l.sold_count} sold</p>
              </div>
              <div className="flex gap-2">
                <Dialog open={stockOpen === l.id} onOpenChange={(o) => { setStockOpen(o ? l.id : null); if (o) loadStock(l.id); }}>
                  <DialogTrigger asChild><Button size="sm" variant="outline">Manage Stock</Button></DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Stock — {l.title}</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <Label>Add units (one per line: e.g. <code>email:password</code> or full credentials)</Label>
                      <Textarea value={stockText} onChange={(e) => setStockText(e.target.value)} rows={5} placeholder="user1@example.com:Pass123&#10;user2@example.com:Pass456" />
                      <Button onClick={() => addStock(l.id)} disabled={!stockText.trim()}>Add to Stock</Button>
                      <div className="border-t border-border pt-3">
                        <p className="text-xs text-muted-foreground mb-2">{stockItems.length} units</p>
                        <div className="space-y-1 max-h-60 overflow-y-auto">
                          {stockItems.map((s) => (
                            <div key={s.id} className="flex items-center justify-between text-xs p-2 rounded bg-secondary/30">
                              <span className="font-mono truncate flex-1">{s.credentials.slice(0, 40)}…</span>
                              <Badge variant="secondary" className="mx-2 text-[10px]">{s.status}</Badge>
                              {s.status === "available" && (
                                <button onClick={() => deleteStock(s.id, l.id)}><Trash2 className="h-3 w-3 text-destructive" /></button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button size="sm" variant="ghost" onClick={() => toggleActive(l)}>{l.is_active ? "Pause" : "Activate"}</Button>
                <Button size="sm" variant="ghost" onClick={() => removeListing(l.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}