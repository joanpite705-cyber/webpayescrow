import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Settings, Save, Percent, Link2, ShieldAlert, KeyRound, HeartPulse, RefreshCw } from "lucide-react";

export default function AdminSettings() {
  const [settings, setSettings] = useState<any>(null);
  const [form, setForm] = useState({ fee_percentage: "2.0", signup_link: "", safety_message: "" });
  const [loading, setLoading] = useState(false);
  const [keys, setKeys] = useState({ walletconnect_project_id: "", alchemy_api_key: "" });
  const [savingKeys, setSavingKeys] = useState(false);
  const [lastPing, setLastPing] = useState<any>(null);
  const [pinging, setPinging] = useState(false);

  useEffect(() => { fetchSettings(); fetchKeys(); fetchPing(); }, []);

  const fetchPing = async () => {
    const { data } = await (supabase as any)
      .from("keepalive_pings")
      .select("created_at, source, stats")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setLastPing(data || null);
  };

  const runPing = async () => {
    setPinging(true);
    const { error } = await supabase.functions.invoke("keepalive");
    setPinging(false);
    if (error) toast.error(error.message);
    else { toast.success("Keepalive ping sent"); fetchPing(); }
  };


  const fetchSettings = async () => {
    const { data } = await supabase.from("platform_settings").select("*").eq("id", 1).maybeSingle();
    if (data) {
      setSettings(data);
      setForm({
        fee_percentage: String(data.fee_percentage),
        signup_link: data.signup_link || "",
        safety_message: data.safety_message || "",
      });
    }
  };

  const fetchKeys = async () => {
    const { data } = await (supabase as any).from("app_config").select("walletconnect_project_id,alchemy_api_key").eq("id", 1).maybeSingle();
    if (data) setKeys({
      walletconnect_project_id: data.walletconnect_project_id || "",
      alchemy_api_key: data.alchemy_api_key || "",
    });
  };

  const saveKeys = async () => {
    setSavingKeys(true);
    const { error } = await (supabase as any).from("app_config").upsert({
      id: 1,
      walletconnect_project_id: keys.walletconnect_project_id.trim() || null,
      alchemy_api_key: keys.alchemy_api_key.trim() || null,
      updated_at: new Date().toISOString(),
    });
    setSavingKeys(false);
    if (error) toast.error(error.message); else toast.success("Web3 keys saved — reload page to apply WalletConnect");
  };

  const saveSettings = async () => {
    setLoading(true);
    const { error } = await supabase.from("platform_settings").upsert({
      id: 1,
      fee_percentage: parseFloat(form.fee_percentage),
      signup_link: form.signup_link,
      safety_message: form.safety_message,
    });
    if (error) toast.error(error.message);
    else toast.success("Settings saved!");
    setLoading(false);
    fetchSettings();
  };

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-8 flex items-center gap-2">
        <Settings className="h-6 w-6 text-primary" /> Platform Settings
      </h1>
      <div className="max-w-2xl space-y-6">
        <div className="glass-card p-8">
          <h2 className="font-semibold mb-5 flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" /> Web3 Keys
          </h2>
          <div className="space-y-4">
            <div>
              <Label>WalletConnect Project ID</Label>
              <Input value={keys.walletconnect_project_id}
                onChange={(e) => setKeys({ ...keys, walletconnect_project_id: e.target.value })}
                placeholder="e.g. 18394b23745a7af92638a70d73f5628f" className="mt-1.5 font-mono text-xs" />
              <p className="text-xs text-muted-foreground mt-1">Public ID from cloud.walletconnect.com — required for the wallet modal.</p>
            </div>
            <div>
              <Label>Alchemy API Key</Label>
              <Input type="password" value={keys.alchemy_api_key}
                onChange={(e) => setKeys({ ...keys, alchemy_api_key: e.target.value })}
                placeholder="alchemy api key" className="mt-1.5 font-mono text-xs" />
              <p className="text-xs text-muted-foreground mt-1">Used by sweeps & balance lookups for ETH, Polygon, Arbitrum, Optimism, Base. Falls back to public RPCs if empty.</p>
            </div>
            <Button onClick={saveKeys} disabled={savingKeys} className="gap-2">
              <Save className="h-4 w-4" /> {savingKeys ? "Saving..." : "Save Web3 Keys"}
            </Button>
          </div>
        </div>

        <div className="glass-card p-8">
          <h2 className="font-semibold mb-5 flex items-center gap-2">
            <Percent className="h-5 w-5 text-primary" /> Fee Configuration
          </h2>
          <div>
            <Label>Platform Fee Percentage (%)</Label>
            <Input type="number" step="0.1" min="0" max="50" value={form.fee_percentage}
              onChange={(e) => setForm({ ...form, fee_percentage: e.target.value })}
              placeholder="2.0" className="mt-1.5 max-w-xs" />
            <p className="text-xs text-muted-foreground mt-1">This percentage is deducted from each completed escrow as platform revenue.</p>
          </div>
        </div>

        <div className="glass-card p-8">
          <h2 className="font-semibold mb-5 flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" /> Bot Configuration
          </h2>
          <div>
            <Label>Signup Link (shown in bot)</Label>
            <Input value={form.signup_link}
              onChange={(e) => setForm({ ...form, signup_link: e.target.value })}
              placeholder="https://webpayescrow.lovable.app/signup" className="mt-1.5" />
            <p className="text-xs text-muted-foreground mt-1">This link is shown to new bot users who need to register.</p>
          </div>
        </div>

        <div className="glass-card p-8">
          <h2 className="font-semibold mb-5 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-warning" /> Safety Message
          </h2>
          <div>
            <Label>Safety Warning (shown at start of each chat)</Label>
            <Textarea value={form.safety_message}
              onChange={(e) => setForm({ ...form, safety_message: e.target.value })}
              rows={4} className="mt-1.5" />
          </div>
        </div>

        <Button onClick={saveSettings} disabled={loading} className="w-full gap-2">
          <Save className="h-4 w-4" /> {loading ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </DashboardLayout>
  );
}
