import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Flag, CheckCircle, XCircle, Trash2, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminScamReports() {
  const { user } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [filter, setFilter] = useState<"pending" | "verified" | "rejected">("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = async () => {
    const { data } = await (supabase as any).from("scam_reports").select("*").order("created_at", { ascending: false });
    setReports(data || []);
  };
  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: "verified" | "rejected") => {
    const { error } = await (supabase as any).from("scam_reports").update({
      status, verified_by: user!.id, verified_at: new Date().toISOString(),
      admin_notes: notes[id] || null,
    }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Report ${status}`);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this report?")) return;
    const { error } = await (supabase as any).from("scam_reports").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted"); load();
  };

  const filtered = reports.filter((r) => r.status === filter);

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
        <Flag className="h-6 w-6 text-destructive" /> Scam Report Verification
      </h1>
      <p className="text-muted-foreground mb-6 text-sm">Review user-submitted scam reports. Verified reports become publicly searchable.</p>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList>
          <TabsTrigger value="pending">Pending ({reports.filter(r => r.status === "pending").length})</TabsTrigger>
          <TabsTrigger value="verified">Verified ({reports.filter(r => r.status === "verified").length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({reports.filter(r => r.status === "rejected").length})</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-4">
          <div className="space-y-3">
            {filtered.length === 0 && (
              <div className="glass-card p-10 text-center text-muted-foreground">No {filter} reports.</div>
            )}
            {filtered.map((r) => (
              <div key={r.id} className="glass-card p-4 md:p-5">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge variant="outline">{r.platform}</Badge>
                  <span className="font-mono text-sm font-bold">{r.handle}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(r.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap mb-2">{r.description}</p>
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-3">
                  {r.amount_lost && <span>💸 Lost: {r.amount_lost} {r.crypto_type || ""}</span>}
                  {r.reporter_email && <span>📧 {r.reporter_email}</span>}
                  {r.reporter_name && <span>👤 {r.reporter_name}</span>}
                  {r.evidence_url && (
                    <a href={r.evidence_url} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1">
                      Evidence <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                {r.admin_notes && filter !== "pending" && (
                  <p className="text-xs text-muted-foreground italic mb-3">Admin: {r.admin_notes}</p>
                )}
                {filter === "pending" && (
                  <div className="flex flex-col sm:flex-row gap-2 mt-3">
                    <Input placeholder="Admin notes (optional)" value={notes[r.id] || ""}
                      onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} className="flex-1" />
                    <Button size="sm" onClick={() => updateStatus(r.id, "verified")} className="gap-1">
                      <CheckCircle className="h-4 w-4" /> Verify
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "rejected")} className="gap-1">
                      <XCircle className="h-4 w-4" /> Reject
                    </Button>
                  </div>
                )}
                {filter !== "pending" && (
                  <Button size="sm" variant="ghost" onClick={() => remove(r.id)}
                    className="gap-1 text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                )}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}