import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CheckCircle, XCircle, DollarSign } from "lucide-react";

export default function AdminPayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [confirmAmounts, setConfirmAmounts] = useState<Record<string, string>>({});

  useEffect(() => { fetchPayments(); }, []);

  const fetchPayments = async () => {
    const { data } = await (supabase as any).from("payments").select("*, escrows(title, amount, crypto_type, fee_amount, buyer_username, buyer_email)").order("created_at", { ascending: false });
    setPayments(data || []);
  };

  const confirmPayment = async (payment: any) => {
    const confirmedAmount = confirmAmounts[payment.id] || String(payment.amount);
    const { error } = await supabase.from("payments").update({
      status: "confirmed" as const,
      confirmed_by: user!.id,
      confirmed_at: new Date().toISOString(),
      amount: parseFloat(confirmedAmount),
    }).eq("id", payment.id);
    if (error) { toast.error(error.message); return; }

    // Update escrow status to confirmed
    await supabase.from("escrows").update({ status: "confirmed" as const }).eq("id", payment.escrow_id);
    // Notify buyer & seller in Telegram
    try {
      await supabase.functions.invoke("telegram-bot", {
        body: { action: "notify_payment_confirmed", escrow_id: payment.escrow_id },
      });
    } catch (e) { /* non-fatal */ }
    toast.success("Payment confirmed! Seller can now release.");
    fetchPayments();
  };

  const rejectPayment = async (paymentId: string, escrowId: string) => {
    const { error } = await supabase.from("payments").update({ status: "rejected" as const }).eq("id", paymentId);
    if (error) { toast.error(error.message); return; }
    // Revert escrow to active so buyer can retry
    await supabase.from("escrows").update({ status: "active" as const }).eq("id", escrowId);
    toast.success("Payment rejected. Buyer can retry.");
    fetchPayments();
  };

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
        <DollarSign className="h-6 w-6 text-primary" /> Payment Management
      </h1>
      <p className="text-muted-foreground mb-8">Verify buyer payments. Enter the confirmed amount before approving.</p>

      <div className="glass-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="p-4">Escrow</th>
                <th className="p-4">Payer</th>
                <th className="p-4">Paid At</th>
                <th className="p-4">Submitted Amount</th>
                <th className="p-4">Fee</th>
                <th className="p-4">Crypto</th>
                <th className="p-4">TX Hash</th>
                <th className="p-4">Status</th>
                <th className="p-4">Confirmed Amount</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-secondary/20">
                  <td className="p-4 font-medium">{p.escrows?.title || "—"}</td>
                  <td className="p-4 text-xs">
                    <div className="font-medium">{p.payer_username ? `@${p.payer_username}` : (p.escrows?.buyer_username ? `@${p.escrows.buyer_username}` : "—")}</div>
                    <div className="text-muted-foreground truncate max-w-[160px]">{p.escrows?.buyer_email || ""}</div>
                  </td>
                  <td className="p-4 text-xs text-muted-foreground whitespace-nowrap">{p.paid_at ? new Date(p.paid_at).toLocaleString() : new Date(p.created_at).toLocaleString()}</td>
                  <td className="p-4 font-mono">{p.amount}</td>
                  <td className="p-4 font-mono text-warning">{p.escrows?.fee_amount || 0}</td>
                  <td className="p-4">{p.crypto_type}</td>
                  <td className="p-4 text-muted-foreground font-mono text-xs max-w-[120px] truncate">{p.tx_hash || "—"}</td>
                  <td className="p-4"><StatusBadge status={p.status} /></td>
                  <td className="p-4">
                    {(p.status === "submitted" || p.status === "pending") && (
                      <Input type="number" step="0.00000001" className="w-28 h-8 text-xs"
                        value={confirmAmounts[p.id] ?? String(p.amount)}
                        onChange={(e) => setConfirmAmounts({ ...confirmAmounts, [p.id]: e.target.value })}
                        placeholder="Amount" />
                    )}
                  </td>
                  <td className="p-4">
                    {(p.status === "submitted" || p.status === "pending") && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => confirmPayment(p)} className="h-7 text-xs gap-1">
                          <CheckCircle className="h-3 w-3" /> Confirm
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => rejectPayment(p.id, p.escrow_id)}
                          className="h-7 text-xs gap-1 text-destructive border-destructive/30">
                          <XCircle className="h-3 w-3" /> Reject
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr><td colSpan={10} className="p-10 text-center text-muted-foreground">No payments yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
