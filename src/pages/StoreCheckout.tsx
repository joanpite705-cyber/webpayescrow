import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Copy, Check, Shield } from "lucide-react";
import { toast } from "sonner";

type Order = {
  id: string; product_title: string; quantity: number; amount: number; currency: string;
  crypto_name: string; network: string; payment_address: string; status: string;
  buyer_email: string; delivered_content: string | null; created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  awaiting_payment: "Awaiting payment",
  payment_submitted: "Payment submitted — under review",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function StoreCheckout() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [txRef, setTxRef] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.rpc("get_store_order", { _id: id as string });
    const o = Array.isArray(data) ? data[0] : data;
    setOrder((o as Order) || null);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);
  useEffect(() => {
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [id]);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied");
    setTimeout(() => setCopied(false), 1500);
  };

  const markPaid = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("mark_store_order_paid", { _id: id as string, _tx_reference: txRef || null });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Thanks — we're verifying your payment"); load(); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  if (!order) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
      Order not found.
      <Link to="/store"><Button variant="outline" size="sm">Back to store</Button></Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/store" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Store
          </Link>
          <Link to="/" className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /><span className="font-semibold">Checkout</span></Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <div className="panel p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Order summary</div>
              <h1 className="mt-1 text-lg font-semibold">{order.product_title}</h1>
              <p className="text-xs text-muted-foreground">Qty {order.quantity} · {order.buyer_email}</p>
            </div>
            <Badge variant="secondary">{STATUS_LABEL[order.status] || order.status}</Badge>
          </div>
          <div className="mt-4 flex items-baseline justify-between border-t border-border pt-3">
            <span className="text-sm text-muted-foreground">Amount due</span>
            <span className="text-xl font-semibold">{order.amount} {order.currency}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Order ref: <span className="font-mono">{order.id.slice(0, 8)}</span> · Bookmark this page to track your order.
          </p>
        </div>

        {order.status === "completed" && order.delivered_content ? (
          <div className="panel p-5">
            <h2 className="font-semibold mb-2">Your delivery</h2>
            <pre className="whitespace-pre-wrap rounded border border-border bg-secondary p-3 text-sm">{order.delivered_content}</pre>
            <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={() => copy(order.delivered_content!)}>
              <Copy className="h-4 w-4" /> Copy
            </Button>
          </div>
        ) : (
          <div className="panel p-5">
            <h2 className="font-semibold">Pay with {order.crypto_name}</h2>
            <p className="text-xs text-muted-foreground">Network: {order.network} — send only {order.crypto_name} on this network.</p>

            <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <div className="rounded border border-border bg-white p-3">
                <QRCodeSVG value={order.payment_address} size={168} level="M" />
              </div>
              <div className="w-full space-y-3">
                <div>
                  <Label className="text-xs">Payment address</Label>
                  <div className="mt-1.5 flex gap-2">
                    <Input readOnly value={order.payment_address} className="font-mono text-xs" />
                    <Button variant="outline" size="icon" onClick={() => copy(order.payment_address)}>
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Transaction hash / reference (optional)</Label>
                  <Input value={txRef} onChange={(e) => setTxRef(e.target.value)} placeholder="0x…" className="mt-1.5 font-mono text-xs" />
                </div>
                <Button className="w-full" disabled={busy || order.status !== "awaiting_payment"} onClick={markPaid}>
                  {order.status !== "awaiting_payment" ? "Payment reported" : busy ? "Submitting…" : "I have paid"}
                </Button>
              </div>
            </div>

            <p className="mt-4 text-[11px] text-muted-foreground">
              Send the exact amount. Once the transaction is confirmed by an admin, your goods are delivered here and to your email.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
