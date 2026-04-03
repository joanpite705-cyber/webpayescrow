import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Eye, EyeOff, MessageSquare, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { t, getUserLanguage } from "@/lib/i18n";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [telegramUsername, setTelegramUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [botLink, setBotLink] = useState("");
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const lang = getUserLanguage();

  useEffect(() => {
    supabase.from("platform_settings").select("signup_link").eq("id", 1).single()
      .then(({ data }) => { if (data?.signup_link) setBotLink(data.signup_link); });
    supabase.from("bot_config").select("bot_username").eq("is_active", true).limit(1).single()
      .then(({ data }) => {
        if (data?.bot_username && !botLink) {
          const u = data.bot_username.replace("@", "");
          setBotLink(`https://t.me/${u}`);
        }
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { toast.error("Passwords don't match"); return; }
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (!telegramUsername) { toast.error("Telegram username is required"); return; }
    setLoading(true);
    const { error } = await signUp(email, password, telegramUsername.replace("@", ""));
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success("Account created! Check your email to confirm."); navigate("/login"); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-4">
          <LanguageSwitcher compact />
        </div>
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold gradient-text">EscrowBot</span>
          </Link>
          <h1 className="text-xl md:text-2xl font-bold">{t("signup", lang)}</h1>
          <p className="text-muted-foreground mt-1 text-sm">Join the secure escrow platform</p>
        </div>

        {/* Telegram Bot CTA */}
        {botLink && (
          <div className="glass-card p-4 mb-4 border-primary/30">
            <div className="flex items-start gap-3">
              <MessageSquare className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Step 1: Start our Telegram Bot</p>
                <p className="text-xs text-muted-foreground mt-1">Onboard via Telegram first to use the escrow system.</p>
                <a href={botLink} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2">
                  Open Telegram Bot <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        )}

        <div className="glass-card p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="telegram">{t("telegram_username", lang)}</Label>
              <Input id="telegram" value={telegramUsername} onChange={(e) => setTelegramUsername(e.target.value)}
                placeholder="@yourusername" required className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="email">{t("email", lang)}</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" required className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="password">{t("password", lang)}</Label>
              <div className="relative mt-1.5">
                <Input id="password" type={showPassword ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="confirmPassword">{t("password", lang)} (confirm)</Label>
              <Input id="confirmPassword" type="password" value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" required className="mt-1.5" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "..." : t("signup", lang)}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">{t("login", lang)}</Link>
          </div>
        </div>
        <div className="mt-4 text-center">
          <Link to="/terms" className="text-xs text-muted-foreground hover:text-primary">Terms & Privacy</Link>
        </div>
      </div>
    </div>
  );
}
