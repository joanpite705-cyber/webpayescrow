import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function AdminDisputes() {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<any[]>([]);
  const [resolutions, setResolutions] = useState<Record<string, string>>({});

  useEffect(() => { fetchDisputes(); }, []);

  const fetchDisputes = async () => {
    const { data } = await supabase.from("disputes").select("*, escrows(title)").order("created_at", { ascending: false });
    setDisputes(data || []);
  };

  const resolveDispute = async (disputeId: string) => {
    const { error } = await supabase.from("disputes").update({
      status: "resolved" as const,
      resolution: resolutions[disputeId] || "Resolved by admin",
      resolved_by: user!.id,
      resolved_at: new Date().toISOString(),
    }).eq("id", disputeId);
    if (error) toast.error(error.message);
    else { toast.success("Dispute resolved"); fetchDisputes(); }
  };

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-8">Dispute Management</h1>
      <div className="space-y-4">
        {disputes.length === 0 ? (
          <div className="glass-card p-10 text-center text-muted-foreground">No disputes.</div>
        ) : disputes.map((d) => (
          <div key={d.id} className="glass-card p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">{d.escrows?.title || "Escrow"}</h3>
              <StatusBadge status={d.status} />
            </div>
            <p className="text-sm text-muted-foreground mb-4">{d.reason}</p>
            {d.resolution && <p className="text-sm text-accent mb-4">Resolution: {d.resolution}</p>}
            {(d.status === "open" || d.status === "under_review") && (
              <div className="flex gap-3">
                <Textarea placeholder="Enter resolution..." value={resolutions[d.id] || ""}
                  onChange={(e) => setResolutions({ ...resolutions, [d.id]: e.target.value })} rows={2} className="flex-1" />
                <Button onClick={() => resolveDispute(d.id)} className="self-end">Resolve</Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
