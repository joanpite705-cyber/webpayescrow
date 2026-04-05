import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Shield, ArrowRight, Lock, Users, Zap, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { t, normalizeExternalUrl, useLanguage } from "@/lib/i18n";

export default function Index() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const [botLink, setBotLink] = useState("");

  useEffect(() => {
    Promise.all([
      supabase.from("platform_settings").select("signup_link").eq("id", 1).maybeSingle(),
      supabase.from("bot_config").select("bot_username").eq("is_active", true).limit(1).maybeSingle(),
    ]).then(([settingsRes, botRes]) => {
      if (botRes.data?.bot_username) {
        setBotLink(`https://t.me/${botRes.data.bot_username.replace("@", "")}`);
        return;
      }

      setBotLink(normalizeExternalUrl(settingsRes.data?.signup_link));
    });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/50 bg-card/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="container flex h-14 md:h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="h-6 w-6 md:h-7 md:w-7 text-primary" />
            <span className="text-lg md:text-xl font-bold gradient-text">EscrowBot</span>
          </Link>
          <div className="flex items-center gap-2 md:gap-3">
            <LanguageSwitcher compact />
            {user ? (
              <Link to="/dashboard"><Button size="sm">{t("dashboard", lang)}</Button></Link>
            ) : (
              <>
                <Link to="/login"><Button variant="ghost" size="sm">{t("login", lang)}</Button></Link>
                <Link to="/signup"><Button size="sm">{t("signup", lang)}</Button></Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <section className="container py-12 md:py-24 text-center px-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs md:text-sm font-medium mb-6 md:mb-8">
          <Zap className="h-3.5 w-3.5" />
          Secure Crypto Escrow via Telegram
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-4 md:mb-6">
          Trade Digital Goods
          <br />
          <span className="gradient-text">With Confidence</span>
        </h1>
        <p className="text-sm md:text-lg text-muted-foreground max-w-2xl mx-auto mb-8 md:mb-10">
          Buy and sell accounts, files, and digital assets safely. Our escrow system protects both buyers and sellers with admin-verified payments.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
          <Link to="/signup">
            <Button size="lg" className="gap-2 text-sm md:text-base px-6 md:px-8 w-full sm:w-auto">
              Start Trading <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          {botLink ? (
            <a href={botLink} target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="outline" className="gap-2 text-sm md:text-base px-6 md:px-8 w-full sm:w-auto">
                <MessageSquare className="h-4 w-4" /> Open Telegram Bot
              </Button>
            </a>
          ) : (
            <Button size="lg" variant="outline" disabled className="gap-2 text-sm md:text-base px-6 md:px-8 w-full sm:w-auto">
              <MessageSquare className="h-4 w-4" /> Open Telegram Bot
            </Button>
          )}
        </div>
      </section>

      <section className="container py-12 md:py-20 px-4">
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {[
            { icon: Lock, title: "Secure Escrow", desc: "Funds held securely until both parties confirm. Admin verifies every payment." },
            { icon: MessageSquare, title: "Telegram Integration", desc: "Manage trades from Telegram with inline buttons. Real-time notifications." },
            { icon: Users, title: "Dispute Resolution", desc: "Built-in dispute system with moderators. Fair resolution backed by evidence." },
          ].map((f) => (
            <div key={f.title} className="glass-card p-6 md:p-8 hover:border-primary/30 transition-colors">
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 md:mb-5">
                <f.icon className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
              <h3 className="text-base md:text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-xs md:text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container py-12 md:py-20 border-t border-border/30 px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12">How It Works</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {[
            { step: "01", title: "Join Bot", desc: "Start our Telegram bot and create your account" },
            { step: "02", title: "Create Escrow", desc: "Set up a trade as buyer or seller" },
            { step: "03", title: "Make Payment", desc: "Send crypto to the provided wallet" },
            { step: "04", title: "Get Confirmed", desc: "Admin verifies and releases goods" },
          ].map((s) => (
            <div key={s.step} className="text-center">
              <div className="text-2xl md:text-4xl font-bold gradient-text mb-2 md:mb-3">{s.step}</div>
              <h4 className="font-semibold text-sm md:text-base mb-1 md:mb-2">{s.title}</h4>
              <p className="text-xs md:text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/30 py-6 md:py-8">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground px-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" /> EscrowBot
          </div>
          <div className="flex gap-4">
            <Link to="/terms" className="hover:text-primary text-xs">Terms & Privacy</Link>
            <span className="text-xs">Secure digital escrow</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
