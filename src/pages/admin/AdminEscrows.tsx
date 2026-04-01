import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { Link } from "react-router-dom";

export default function AdminEscrows() {
  const [escrows, setEscrows] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("escrows").select("*").order("created_at", { ascending: false })
      .then(({ data }) => setEscrows(data || []));
  }, []);

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-8">All Escrows</h1>
      <div className="glass-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="p-4">Title</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Status</th>
                <th className="p-4">Created</th>
              </tr>
            </thead>
            <tbody>
              {escrows.map((e) => (
                <tr key={e.id} className="border-b border-border/50 hover:bg-secondary/20">
                  <td className="p-4">
                    <Link to={`/dashboard/escrows/${e.id}`} className="text-primary hover:underline font-medium">{e.title}</Link>
                  </td>
                  <td className="p-4 font-mono">{e.amount} {e.crypto_type}</td>
                  <td className="p-4"><StatusBadge status={e.status} /></td>
                  <td className="p-4 text-muted-foreground">{new Date(e.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
