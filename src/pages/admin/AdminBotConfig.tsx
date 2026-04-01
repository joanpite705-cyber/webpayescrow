import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Bot, Save } from "lucide-react";

export default function AdminBotConfig() {
  const [config, setConfig] = useState<any>(null);
  const [form, setForm] = useState({ bot_username: "", bot_token: "", chat_id: "", is_active: false });
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchConfig(); }, []);

  const fetchConfig = async () => {
    const { data } = await supabase.from("bot_config").select("*").limit(1).single();
    if (data) {
      setConfig(data);
      setForm({ bot_username: data.bot_username || "", bot_token: data.bot_token || "", chat_id: data.chat_id || "", is_active: data.is_active });
    }
  };

  const saveConfig = async () => {
    setLoading(true);
    if (config) {
      const { error } = await supabase.from("bot_config").update(form).eq("id", config.id);
      if (error) toast.error(error.message);
      else toast.success("Bot config updated");
    } else {
      const { error } = await supabase.from("bot_config").insert(form);
      if (error) toast.error(error.message);
      else toast.success("Bot config created");
    }
    setLoading(false);
    fetchConfig();
  };

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-8 flex items-center gap-2"><Bot className="h-6 w-6 text-primary" /> Telegram Bot Configuration</h1>
      <div className="glass-card p-8 max-w-lg">
        <div className="space-y-5">
          <div>
            <Label>Bot Username</Label>
            <Input value={form.bot_username} onChange={(e) => setForm({ ...form, bot_username: e.target.value })}
              placeholder="@YourEscrowBot" className="mt-1.5" />
          </div>
          <div>
            <Label>Bot Token</Label>
            <Input type="password" value={form.bot_token} onChange={(e) => setForm({ ...form, bot_token: e.target.value })}
              placeholder="123456:ABC-DEF..." className="mt-1.5" />
            <p className="text-xs text-muted-foreground mt-1">Get this from @BotFather on Telegram</p>
          </div>
          <div>
            <Label>Admin Chat ID</Label>
            <Input value={form.chat_id} onChange={(e) => setForm({ ...form, chat_id: e.target.value })}
              placeholder="e.g. -1001234567890" className="mt-1.5" />
          </div>
          <div className="flex items-center justify-between">
            <Label>Bot Active</Label>
            <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
          </div>
          <Button onClick={saveConfig} disabled={loading} className="w-full gap-2">
            <Save className="h-4 w-4" /> {loading ? "Saving..." : "Save Configuration"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
