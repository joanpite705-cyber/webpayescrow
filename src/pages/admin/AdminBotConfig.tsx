import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Bot, Save, Webhook, CheckCircle, XCircle } from "lucide-react";

export default function AdminBotConfig() {
  const [config, setConfig] = useState<any>(null);
  const [form, setForm] = useState({ bot_username: "", bot_token: "", chat_id: "", is_active: false });
  const [loading, setLoading] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<string | null>(null);
  const [webhookLoading, setWebhookLoading] = useState(false);

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

  const activateWebhook = async () => {
    setWebhookLoading(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const webhookUrl = `https://${projectId}.supabase.co/functions/v1/telegram-bot`;

      const { data, error } = await supabase.functions.invoke("telegram-bot", {
        body: { action: "set_webhook", webhook_url: webhookUrl },
      });

      if (error) {
        toast.error("Failed to set webhook: " + error.message);
        setWebhookStatus("error");
      } else if (data?.ok) {
        toast.success("Webhook activated successfully!");
        setWebhookStatus("active");
      } else {
        toast.error("Webhook setup failed: " + JSON.stringify(data));
        setWebhookStatus("error");
      }
    } catch (err: any) {
      toast.error("Error: " + err.message);
      setWebhookStatus("error");
    }
    setWebhookLoading(false);
  };

  const removeWebhook = async () => {
    setWebhookLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("telegram-bot", {
        body: { action: "set_webhook", webhook_url: "" },
      });
      if (error) toast.error(error.message);
      else {
        toast.success("Webhook removed");
        setWebhookStatus(null);
      }
    } catch (err: any) {
      toast.error(err.message);
    }
    setWebhookLoading(false);
  };

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-8 flex items-center gap-2"><Bot className="h-6 w-6 text-primary" /> Telegram Bot Configuration</h1>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass-card p-8">
          <h2 className="font-semibold mb-5">Bot Settings</h2>
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

        <div className="glass-card p-8">
          <h2 className="font-semibold mb-5 flex items-center gap-2">
            <Webhook className="h-5 w-5" /> Webhook Management
          </h2>
          <div className="space-y-4">
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 mb-2">
                {webhookStatus === "active" ? (
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                ) : webhookStatus === "error" ? (
                  <XCircle className="h-5 w-5 text-destructive" />
                ) : (
                  <Webhook className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="font-medium text-sm">
                  {webhookStatus === "active" ? "Webhook Active" : webhookStatus === "error" ? "Webhook Error" : "Webhook Not Set"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                The webhook connects Telegram to your bot backend function. Activate it after saving your bot token.
              </p>
            </div>

            <Button onClick={activateWebhook} disabled={webhookLoading || !form.bot_token} className="w-full gap-2">
              <Webhook className="h-4 w-4" /> {webhookLoading ? "Setting up..." : "Activate Webhook"}
            </Button>

            <Button variant="outline" onClick={removeWebhook} disabled={webhookLoading} className="w-full gap-2 text-destructive">
              <XCircle className="h-4 w-4" /> Remove Webhook
            </Button>

            <Button variant="secondary" onClick={registerCommands} disabled={webhookLoading} className="w-full gap-2">
              <Bot className="h-4 w-4" /> Register Bot Commands
            </Button>

            <div className="text-xs text-muted-foreground mt-2 p-3 rounded bg-secondary/30">
              <p className="font-medium mb-1">Webhook URL:</p>
              <code className="break-all text-[10px]">
                https://{import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/telegram-bot
              </code>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
