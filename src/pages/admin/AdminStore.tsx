import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, Copy, Package, X } from "lucide-react";
import { toast } from "sonner";

const EMPTY = {
  title: "", description: "", category: "other", price: 0, currency: "USD",
  image_url: "", delivery_type: "instant", delivery_content: "",
  stock: 0, unlimited_stock: false, is_active: true, sort_order: 0,
};

export default function AdminStore() {
  const [tab, setTab] = useState<"products" | "orders">("products");
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [form, setForm] = useState<any>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    const [{ data: p }, { data: o }, { data: w }] = await Promise.all([
      supabase.from("store_products").select("*").order("sort_order").order("created_at", { ascending: false }),
      supabase.from("store_orders").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("crypto_wallets").select("*").eq("is_active", true).order("crypto_name"),
    ]);
    setProducts(p || []); setOrders(o || []); setWallets(w || []);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.title.trim()) { toast.error("Title required"); return; }
    const payload = { ...form, price: Number(form.price) || 0, stock: Number(form.stock) || 0, sort_order: Number(form.sort_order) || 0 };
    const { error } = editingId
      ? await supabase.from("store_products").update(payload).eq("id", editingId)
      : await supabase.from("store_products").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(editingId ? "Product updated" : "Product added");
    setForm(EMPTY); setEditingId(null); setShowForm(false); load();
  };

  const edit = (p: any) => {
    setEditingId(p.id);
    setForm({ ...EMPTY, ...p });
    setShowForm(true);
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("store_products").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  const setOrderStatus = async (o: any, status: string) => {
    const patch: any = { status };
    if (status === "completed") {
      const prod = products.find((p) => p.id === o.product_id);
      patch.delivered_content = o.delivered_content || prod?.delivery_content || "Your order has been fulfilled.";
      patch.delivered_at = new Date().toISOString();
    }
    const { error } = await supabase.from("store_orders").update(patch).eq("id", o.id);
    if (error) { toast.error(error.message); return; }
    if (status === "completed") {
      const prod = products.find((p) => p.id === o.product_id);
      if (prod && !prod.unlimited_stock) {
        await supabase.from("store_products").update({ stock: Math.max(0, prod.stock - o.quantity) }).eq("id", prod.id);
      }
    }
    toast.success("Order updated"); load();
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Digital Goods Store</h1>
        <div className="flex gap-2">
          <Button variant={tab === "products" ? "default" : "outline"} size="sm" onClick={() => setTab("products")}>Products</Button>
          <Button variant={tab === "orders" ? "default" : "outline"} size="sm" onClick={() => setTab("orders")}>Orders</Button>
        </div>
      </div>

      {tab === "products" && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{products.length} product(s)</p>
            <Button size="sm" className="gap-2" onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(EMPTY); }}>
              {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showForm ? "Cancel" : "Add product"}
            </Button>
          </div>

          {showForm && (
            <div className="panel p-5 mb-6 space-y-4">
              <h3 className="font-semibold">{editingId ? "Edit product" : "New product"}</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div><Label>Title</Label><Input className="mt-1.5" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div><Label>Category</Label><Input className="mt-1.5" value={form.category} placeholder="software, accounts, guides…" onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
                <div><Label>Price</Label><Input className="mt-1.5" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
                <div><Label>Currency</Label><Input className="mt-1.5" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></div>
                <div><Label>Image URL</Label><Input className="mt-1.5" value={form.image_url || ""} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
                <div><Label>Delivery type</Label><Input className="mt-1.5" value={form.delivery_type} placeholder="instant / manual" onChange={(e) => setForm({ ...form, delivery_type: e.target.value })} /></div>
                <div><Label>Stock</Label><Input className="mt-1.5" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></div>
                <div><Label>Sort order</Label><Input className="mt-1.5" type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} /></div>
              </div>
              <div><Label>Description</Label><Textarea className="mt-1.5" rows={3} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div>
                <Label>Delivery content (private — sent to the buyer after payment)</Label>
                <Textarea className="mt-1.5 font-mono text-xs" rows={4} value={form.delivery_content || ""} onChange={(e) => setForm({ ...form, delivery_content: e.target.value })} />
              </div>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm"><Switch checked={form.unlimited_stock} onCheckedChange={(v) => setForm({ ...form, unlimited_stock: v })} /> Unlimited stock</label>
                <label className="flex items-center gap-2 text-sm"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /> Active</label>
              </div>
              <Button className="gap-2" onClick={save}><Save className="h-4 w-4" /> {editingId ? "Save changes" : "Create product"}</Button>
            </div>
          )}

          <div className="grid gap-3">
            {products.map((p) => (
              <div key={p.id} className="panel flex flex-wrap items-center gap-3 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded border border-border bg-secondary">
                  {p.image_url ? <img src={p.image_url} alt="" className="h-full w-full object-cover" /> : <Package className="h-5 w-5 text-muted-foreground" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{p.title}</span>
                    {!p.is_active && <Badge variant="secondary">hidden</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {p.price} {p.currency} · {p.category} · {p.unlimited_stock ? "unlimited" : `${p.stock} in stock`}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => edit(p)}>Edit</Button>
                <Button variant="ghost" size="icon" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            {products.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No products yet.</p>}
          </div>

          <div className="panel mt-8 p-5">
            <h3 className="mb-1 font-semibold">Checkout coins</h3>
            <p className="mb-3 text-xs text-muted-foreground">
              Checkout uses the same active wallets as escrow (Crypto Wallets page). Buyers can copy the address or scan the QR.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {wallets.map((w) => (
                <div key={w.id} className="flex items-center gap-2 rounded border border-border p-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{w.crypto_name} <span className="text-xs text-muted-foreground">· {w.network}</span></div>
                    <div className="truncate font-mono text-xs text-muted-foreground">{w.wallet_address}</div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(w.wallet_address); toast.success("Copied"); }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {wallets.length === 0 && <p className="text-sm text-muted-foreground">No active wallets — add them under Crypto Wallets.</p>}
            </div>
          </div>
        </>
      )}

      {tab === "orders" && (
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="p-3">Product</th><th className="p-3">Buyer</th><th className="p-3">Amount</th>
                <th className="p-3">Coin</th><th className="p-3">Status</th><th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-border/50">
                  <td className="p-3">{o.product_title} <span className="text-xs text-muted-foreground">×{o.quantity}</span></td>
                  <td className="p-3 text-xs">{o.buyer_email}</td>
                  <td className="p-3">{o.amount} {o.currency}</td>
                  <td className="p-3 text-xs">{o.crypto_name} / {o.network}</td>
                  <td className="p-3"><Badge variant="secondary">{o.status}</Badge></td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" disabled={o.status === "completed"} onClick={() => setOrderStatus(o, "completed")}>Deliver</Button>
                      <Button size="sm" variant="ghost" disabled={o.status === "cancelled"} onClick={() => setOrderStatus(o, "cancelled")}>Cancel</Button>
                    </div>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No orders yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
