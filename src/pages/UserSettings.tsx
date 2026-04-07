import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { t, useLanguage } from "@/lib/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { User, Lock, Globe, MessageSquare } from "lucide-react";

export default function UserSettings() {
  const { profile, refreshProfile } = useAuth();
  const { lang } = useLanguage();
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [botLink, setBotLink] = useState("");

  useEffect(() => {
    supabase.from("bot_config").select("bot_username").eq("is_active", true).limit(1).maybeSingle()
      .then(({ data }) => {
        if (data?.bot_username) setBotLink(`https://t.me/${data.bot_username.replace("@", "")}`);
      });
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName })
      .eq("id", profile.id);
    setLoading(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Profile updated");
      refreshProfile();
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Password updated!");
      setNewPassword("");
    }
  };

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-8">{t("settings", lang)}</h1>
      <div className="grid gap-6 max-w-lg">
        {/* Profile */}
        <div className="glass-card p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <User className="h-4 w-4 text-primary" /> {t("profile_settings", lang)}
          </h2>
          <div className="space-y-4">
            <div>
              <Label>{t("telegram_username", lang)}</Label>
              <Input value={profile?.telegram_username || ""} disabled className="mt-1.5 opacity-60" />
            </div>
            <div>
              <Label>{t("display_name", lang)}</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1.5" />
            </div>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "..." : t("save", lang)}
            </Button>
          </div>
        </div>

        {/* Password */}
        <div className="glass-card p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" /> {t("change_password", lang)}
          </h2>
          <div className="space-y-4">
            <div>
              <Label>{t("new_password", lang)}</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters" className="mt-1.5" />
            </div>
            <Button onClick={handlePasswordChange} disabled={loading || !newPassword}>
              {t("change_password", lang)}
            </Button>
            {botLink && (
              <p className="text-xs text-muted-foreground">
                {t("forgot_password", lang)}{" "}
                <a href={botLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" /> {t("reset_via_bot", lang)}
                </a>
              </p>
            )}
          </div>
        </div>

        {/* Language */}
        <div className="glass-card p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" /> {t("language", lang)}
          </h2>
          <LanguageSwitcher />
        </div>
      </div>
    </DashboardLayout>
  );
}
