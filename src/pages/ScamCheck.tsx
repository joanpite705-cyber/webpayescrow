import { useState } from "react";
import { Link } from "react-router-dom";
import { Shield, Search, AlertTriangle, CheckCircle2, Flag, ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const SCAM_PLATFORMS = [
  "Telegram", "WhatsApp", "Instagram", "Facebook", "X / Twitter", "Snapchat",
  "Viber", "Signal", "WeChat", "Line", "KakaoTalk", "Discord", "Skype",
  "TikTok", "Reddit", "LinkedIn", "Threads", "iMessage", "SMS", "Email",
  "Phone Number", "Other",
];

type Report = {
  id: string; platform: string; handle: string; description: string;
  amount_lost: number | null; crypto_type: string | null; evidence_url: string | null;
  verified_at: string | null; created_at: string;
};

export default function ScamCheck() {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Report[]>([]);

  const [openReport, setOpenReport] = useState(false);
  const [form, setForm] = useState({
    platform: "Telegram", handle: "", description: "",
    amount_lost: "", crypto_type: "", evidence_url: "",
    reporter_email: "", reporter_name: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const search = async () => {
    const q = query.trim();
    if (!q) { toast.error("Enter a handle, email, or number"); return; }
    setLoading(true); setSearched(true);
    const { data, error } = await (supabase as any).rpc("search_scam_reports", { _handle: q });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setResults((data || []) as Report[]);
  };

  const submitReport = async () => {
    if (!form.handle.trim() || !form.description.trim()) {
      toast.error("Handle and description are required");
      return;
    }
    setSubmitting(true);
    const { error } = await (supabase as any).from("scam_reports").insert({
      platform: form.platform,
      handle: form.handle.trim(),
      description: form.description.trim(),
      amount_lost: form.amount_lost ? Number(form.amount_lost) : null,
      crypto_type: form.crypto_type || null,
      evidence_url: form.evidence_url || null,
      reporter_email: form.reporter_email || null,
      reporter_name: form.reporter_name || null,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Report submitted! Pending admin review.");
    setOpenReport(false);
    setForm({ ...form, handle: "", description: "", amount_lost: "", evidence_url: "" });
  };

  const verifiedScam = searched && results.length > 0;
  const cleanRecord = searched && results.length === 0;

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/50 bg-card/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="container flex h-14 md:h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            <Shield className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold gradient-text">EscrowBot</span>
          </Link>
          <span className="text-xs text-muted-foreground">Scam Check</span>
        </div>
      </nav>

      <section className="container max-w-3xl px-4 py-10 md:py-16">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium mb-5">
            <AlertTriangle className="h-3.5 w-3.5" /> Community Scam Database
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-3">Check Before You Trade</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Search any handle, email, phone or username across messaging platforms.
          </p>
        </div>

        <div className="glass-card p-5 md:p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="e.g. @scammer, scammer@mail.com, +1234567890"
              className="flex-1"
            />
            <Button onClick={search} disabled={loading} className="gap-2">
              <Search className="h-4 w-4" /> {loading ? "Checking…" : "Check"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            We search verified reports across {SCAM_PLATFORMS.length}+ platforms.
          </p>
        </div>

        {verifiedScam && (
          <div className="glass-card border-destructive/40 bg-destructive/5 p-5 md:p-6 mb-6 animate-in fade-in">
            <div className="flex items-start gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-destructive/15 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <Badge variant="destructive" className="mb-2">⚠️ SCAM REPORTED</Badge>
                <h2 className="text-lg md:text-xl font-bold">
                  {results.length} verified report{results.length > 1 ? "s" : ""} found for "{query}"
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Do NOT trade. Block immediately and warn others.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {results.map((r) => (
                <div key={r.id} className="rounded-lg border border-border/60 bg-card/40 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-xs">{r.platform}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.verified_at || r.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{r.description}</p>
                  {(r.amount_lost || r.crypto_type) && (
                    <p className="text-xs text-warning mt-2">
                      Loss: {r.amount_lost || "?"} {r.crypto_type || ""}
                    </p>
                  )}
                  {r.evidence_url && (
                    <a href={r.evidence_url} target="_blank" rel="noreferrer"
                       className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2">
                      Evidence <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {cleanRecord && (
          <div className="glass-card border-success/40 bg-success/5 p-5 md:p-6 mb-6 animate-in fade-in">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-success/15 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <Badge className="mb-2 bg-success/20 text-success border-success/30">No reports yet</Badge>
                <h2 className="text-lg font-bold">"{query}" has no verified scam reports.</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Still — always use escrow and verify identity before trading. Found a scam? Report below.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="text-center">
          <Dialog open={openReport} onOpenChange={setOpenReport}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Flag className="h-4 w-4" /> Report a Scammer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Flag className="h-5 w-5 text-destructive" /> Submit Scam Report
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                <div>
                  <label className="text-xs text-muted-foreground">Platform *</label>
                  <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {SCAM_PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Handle / Email / Number *</label>
                  <Input value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })}
                    placeholder="@scammer or email or phone" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">What happened? *</label>
                  <Textarea rows={4} value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Describe the scam, dates, what they promised…" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Amount lost</label>
                    <Input type="number" step="0.00000001" value={form.amount_lost}
                      onChange={(e) => setForm({ ...form, amount_lost: e.target.value })} placeholder="0" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Crypto / Currency</label>
                    <Input value={form.crypto_type}
                      onChange={(e) => setForm({ ...form, crypto_type: e.target.value })} placeholder="USDT" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Evidence URL (screenshot / tx link)</label>
                  <Input value={form.evidence_url}
                    onChange={(e) => setForm({ ...form, evidence_url: e.target.value })} placeholder="https://…" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Your name (optional)</label>
                    <Input value={form.reporter_name}
                      onChange={(e) => setForm({ ...form, reporter_name: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Your email (optional)</label>
                    <Input type="email" value={form.reporter_email}
                      onChange={(e) => setForm({ ...form, reporter_email: e.target.value })} />
                  </div>
                </div>
                <Button onClick={submitReport} disabled={submitting} className="w-full">
                  {submitting ? "Submitting…" : "Submit Report"}
                </Button>
                <p className="text-[10px] text-muted-foreground text-center">
                  Reports are reviewed by moderators before being made public.
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mt-12 grid grid-cols-3 sm:grid-cols-6 gap-2 opacity-60">
          {SCAM_PLATFORMS.slice(0, 12).map((p) => (
            <div key={p} className="text-[10px] text-center px-2 py-1 rounded bg-muted/30">{p}</div>
          ))}
        </div>
      </section>
    </div>
  );
}