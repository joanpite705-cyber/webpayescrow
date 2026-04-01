import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UserEscrows() {
  const { user } = useAuth();
  const [escrows, setEscrows] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("escrows")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setEscrows(data || []));
  }, [user]);

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">My Escrows</h1>
        <Link to="/dashboard/escrows/new">
          <Button className="gap-2"><Plus className="h-4 w-4" /> New Escrow</Button>
        </Link>
      </div>

      <div className="glass-card">
        {escrows.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">No escrows found.</div>
        ) : (
          <div className="divide-y divide-border">
            {escrows.map((e) => (
              <Link key={e.id} to={`/dashboard/escrows/${e.id}`}
                className="flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors">
                <div>
                  <p className="font-medium">{e.title}</p>
                  <p className="text-sm text-muted-foreground">{e.amount} {e.crypto_type} · {new Date(e.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {e.buyer_id === user?.id ? "Buyer" : e.seller_id === user?.id ? "Seller" : "Creator"}
                  </span>
                  <StatusBadge status={e.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
