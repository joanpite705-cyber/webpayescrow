import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Settings, Save, Percent, Link2, ShieldAlert } from "lucide-react";

export default function AdminSettings() {
  const [settings, setSettings] = useState<any>(null);
  const [form, setForm] = useState({ fee_percentage: "2.0", signup_link: "", safety_message: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    const { data } = await supabase.from("platform_settings").select("*").eq("id", 1).single();
    if (data) {
      setSettings(data);
      setForm({
        fee_percentage: String(data.fee_percentage),
        signup_link: data.signup_link || "",
        safety_message: data.safety_message || "",
      });
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    const { error } = await supabase.from("platform_settings").update({
      fee_percentage: parseFloat(form.fee_percentage),
      signup_link: form.signup_link,
      safety_message: form.safety_message,
    }).eq("id", 1);
    if (error) toast.error(error.message);
    else toast.success("Settings saved!");
    setLoading(false);
  };

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-8 flex items-center gap-2">
        <Settings className="h-6 w-6 text-primary" /> Platform Settings
      </h1>
      <div className="max-w-2xl space-y-6">
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
