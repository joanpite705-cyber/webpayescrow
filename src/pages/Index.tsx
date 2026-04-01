import { Link } from "react-router-dom";
import { Shield, ArrowRight, Lock, Users, Zap, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export default function Index() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border/50 bg-card/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold gradient-text">EscrowBot</span>
          </Link>
          <div className="flex gap-3">
            {user ? (
              <Link to="/dashboard">
                <Button>Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link to="/signup">
                  <Button>Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="container py-24 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8">
          <Zap className="h-3.5 w-3.5" />
          Secure Crypto Escrow via Telegram
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
          Trade Digital Goods
          <br />
          <span className="gradient-text">With Confidence</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
          Buy and sell accounts, files, and digital assets safely. Our escrow system protects both 
          buyers and sellers with admin-verified payments and Telegram bot integration.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/signup">
            <Button size="lg" className="gap-2 text-base px-8">
              Start Trading <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <a href="https://t.me/" target="_blank" rel="noopener noreferrer">
            <Button size="lg" variant="outline" className="gap-2 text-base px-8">
              <MessageSquare className="h-4 w-4" />
              Open Telegram Bot
            </Button>
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="container py-20">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Lock,
              title: "Secure Escrow",
              desc: "Funds are held securely until both parties confirm the transaction. Admin verifies every payment.",
            },
            {
              icon: MessageSquare,
              title: "Telegram Integration",
              desc: "Manage trades directly from Telegram with inline buttons. Get real-time notifications on every step.",
            },
            {
              icon: Users,
              title: "Dispute Resolution",
              desc: "Built-in dispute system with moderators. Fair resolution backed by transaction evidence.",
            },
          ].map((f) => (
            <div key={f.title} className="glass-card p-8 hover:border-primary/30 transition-colors">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                <f.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="container py-20 border-t border-border/30">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-4 gap-8">
          {[
            { step: "01", title: "Join Bot", desc: "Start our Telegram bot and create your account" },
            { step: "02", title: "Create Escrow", desc: "Set up a trade as buyer or seller with your counterpart" },
            { step: "03", title: "Make Payment", desc: "Send crypto to the provided wallet address" },
            { step: "04", title: "Get Confirmed", desc: "Admin verifies payment and releases the goods" },
          ].map((s) => (
            <div key={s.step} className="text-center">
              <div className="text-4xl font-bold gradient-text mb-3">{s.step}</div>
              <h4 className="font-semibold mb-2">{s.title}</h4>
              <p className="text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8">
        <div className="container flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            EscrowBot
          </div>
          <p>Secure digital escrow powered by crypto</p>
        </div>
      </footer>
    </div>
  );
}
