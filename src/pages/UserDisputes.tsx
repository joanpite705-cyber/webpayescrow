import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";

export default function UserDisputes() {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("disputes")
      .select("*, escrows(title)")
      .order("created_at", { ascending: false })
      .then(({ data }) => setDisputes(data || []));
  }, [user]);

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-8">My Disputes</h1>
      <div className="glass-card">
        {disputes.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">No disputes.</div>
        ) : (
          <div className="divide-y divide-border">
            {disputes.map((d) => (
              <div key={d.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">{d.escrows?.title || "Escrow"}</p>
                  <StatusBadge status={d.status} />
                </div>
                <p className="text-sm text-muted-foreground">{d.reason}</p>
                {d.resolution && (
                  <p className="text-sm text-accent mt-2">Resolution: {d.resolution}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
