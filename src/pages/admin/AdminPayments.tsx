import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle, XCircle } from "lucide-react";

export default function AdminPayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => { fetchPayments(); }, []);

  const fetchPayments = async () => {
    const { data } = await supabase.from("payments").select("*, escrows(title)").order("created_at", { ascending: false });
    setPayments(data || []);
  };

  const confirmPayment = async (paymentId: string) => {
    const { error } = await supabase.from("payments").update({
      status: "confirmed" as const,
      confirmed_by: user!.id,
      confirmed_at: new Date().toISOString(),
    }).eq("id", paymentId);
    if (error) toast.error(error.message);
    else { toast.success("Payment confirmed"); fetchPayments(); }
  };

  const rejectPayment = async (paymentId: string) => {
    const { error } = await supabase.from("payments").update({
      status: "rejected" as const,
    }).eq("id", paymentId);
    if (error) toast.error(error.message);
    else { toast.success("Payment rejected"); fetchPayments(); }
  };

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-8">Payment Management</h1>
      <div className="glass-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="p-4">Escrow</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Crypto</th>
                <th className="p-4">TX Hash</th>
                <th className="p-4">Status</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-secondary/20">
                  <td className="p-4 font-medium">{p.escrows?.title || "—"}</td>
                  <td className="p-4 font-mono">{p.amount}</td>
                  <td className="p-4">{p.crypto_type}</td>
                  <td className="p-4 text-muted-foreground font-mono text-xs max-w-[120px] truncate">{p.tx_hash || "—"}</td>
                  <td className="p-4"><StatusBadge status={p.status} /></td>
                  <td className="p-4">
                    {(p.status === "submitted" || p.status === "pending") && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => confirmPayment(p.id)} className="h-7 text-xs gap-1">
                          <CheckCircle className="h-3 w-3" /> Confirm
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => rejectPayment(p.id)} className="h-7 text-xs gap-1 text-destructive border-destructive/30">
                          <XCircle className="h-3 w-3" /> Reject
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
