import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Package, Link2, KeyRound, FileText, ShieldCheck } from "lucide-react";

type ReleaseType = "link" | "credentials" | "file" | "text";

interface Props {
  escrowId: string;
  senderId: string;
  onSubmitted?: () => void;
}

export default function StructuredReleaseForm({ escrowId, senderId, onSubmitted }: Props) {
  const [type, setType] = useState<ReleaseType>("link");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [needsModerator, setNeedsModerator] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!content.trim() && !fileUrl.trim()) {
      toast.error("Please add the delivery content");
      return;
    }
    setLoading(true);
    const releaseTitle = title.trim() || (
      type === "link" ? "Delivery Link" :
      type === "credentials" ? "Credentials" :
      type === "file" ? "File Delivery" : "Delivery"
    );
    const { error: rErr } = await supabase.from("escrow_releases").insert({
      escrow_id: escrowId,
      sender_id: senderId,
      release_type: type,
      title: releaseTitle,
      content: content.trim() || null,
      file_url: fileUrl.trim() || null,
      requires_moderator_review: needsModerator,
    });
    if (rErr) { toast.error(rErr.message); setLoading(false); return; }

    // Mirror to chat
    const icon = type === "link" ? "🔗" : type === "credentials" ? "🔑" : type === "file" ? "📎" : "📝";
    const body =
      `${icon} *${releaseTitle}* (${type})\n\n` +
      (content.trim() ? `${content.trim()}\n` : "") +
      (fileUrl.trim() ? `\n📎 ${fileUrl.trim()}\n` : "") +
      (needsModerator ? `\n🛡️ Awaiting moderator verification` : "");

    await supabase.from("escrow_messages").insert({
      escrow_id: escrowId,
      sender_id: senderId,
      message: body,
      message_type: "release",
      message_label: "Seller Delivery",
    });

    toast.success("Delivery submitted");
    setTitle(""); setContent(""); setFileUrl(""); setNeedsModerator(false);
    setLoading(false);
    onSubmitted?.();
  };

  return (
    <div className="glass-card p-6 border border-emerald-500/30">
      <h3 className="font-semibold mb-4 flex items-center gap-2 text-emerald-400">
        <Package className="h-4 w-4" /> Submit Delivery
      </h3>

      <div className="grid grid-cols-4 gap-2 mb-4">
        {([
          { v: "link", label: "Link", icon: Link2 },
          { v: "credentials", label: "Login", icon: KeyRound },
          { v: "file", label: "File", icon: FileText },
          { v: "text", label: "Note", icon: Package },
        ] as const).map(({ v, label, icon: Icon }) => (
          <button
            key={v}
            type="button"
            onClick={() => setType(v)}
            className={`flex flex-col items-center gap-1 rounded-lg p-3 text-xs border transition ${
              type === v ? "bg-primary/20 border-primary text-primary" : "bg-secondary/30 border-border hover:bg-secondary/60"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-xs">Title (optional)</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Netflix login" className="mt-1" />
        </div>

        {type === "link" && (
          <div>
            <Label className="text-xs">URL</Label>
            <Input value={content} onChange={(e) => setContent(e.target.value)} placeholder="https://..." className="mt-1" />
          </div>
        )}

        {type === "credentials" && (
          <div>
            <Label className="text-xs">Username / Email / Password</Label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)}
              placeholder={"email: user@example.com\npassword: ••••••\nnotes:"} rows={4} className="mt-1 font-mono text-xs" />
          </div>
        )}

        {type === "file" && (
          <>
            <div>
              <Label className="text-xs">File URL</Label>
              <Input value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://drive.google.com/..." className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Description (optional)</Label>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={2} className="mt-1" />
            </div>
          </>
        )}

        {type === "text" && (
          <div>
            <Label className="text-xs">Delivery details</Label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} className="mt-1" />
          </div>
        )}

        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <Checkbox checked={needsModerator} onCheckedChange={(v) => setNeedsModerator(!!v)} />
          <ShieldCheck className="h-3.5 w-3.5" /> Request moderator verification before release
        </label>

        <Button onClick={submit} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700">
          {loading ? "Submitting..." : "Submit Delivery"}
        </Button>
      </div>
    </div>
  );
}
