import { Link } from "react-router-dom";
import { Shield, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export default function Terms() {
  const { lang } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/50 bg-card/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="container flex h-14 items-center gap-4 px-4">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold gradient-text">EscrowBot</span>
          </Link>
        </div>
      </nav>

      <div className="container max-w-3xl py-10 px-4">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-primary hover:underline mb-6">
          <ArrowLeft className="h-3 w-3" /> Back
        </Link>

        <h1 className="text-2xl md:text-3xl font-bold mb-6">Terms of Service & Privacy Policy</h1>

        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p>By accessing or using EscrowBot ("Platform"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">2. Description of Service</h2>
            <p>EscrowBot is a peer-to-peer crypto escrow platform facilitating secure digital goods transactions between buyers and sellers. The Platform holds funds in escrow until both parties confirm the transaction.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">3. Account Requirements</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>You must provide a valid Telegram username to create an account.</li>
              <li>You are responsible for maintaining the security of your credentials.</li>
              <li>Accounts cannot be transferred or sold.</li>
              <li>One account per person — duplicate accounts will be terminated.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Trading Rules</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>All trades must go through escrow.</strong> Off-platform trading is prohibited and voids all protections.</li>
              <li>Buyers must send payment within the specified time window (30 minutes from acceptance).</li>
              <li>Sellers must deliver the agreed goods/service after payment is confirmed.</li>
              <li>A platform fee is deducted from each completed transaction.</li>
              <li>Both parties must rate each other after trade completion.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Disputes & Moderation</h2>
            <p>Either party can raise a dispute. A moderator will review the evidence and make a binding decision. Moderator decisions are final. For trades involving credentials or digital access, moderators may use a virtual environment to verify goods — an additional verification fee may apply.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">6. Prohibited Activities</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Selling illegal or stolen goods</li>
              <li>Fraudulent claims or chargebacks</li>
              <li>Attempting to bypass escrow protections</li>
              <li>Harassing other users or moderators</li>
              <li>Creating fake accounts or manipulating ratings</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">7. Privacy</h2>
            <p>We collect minimal data: email, Telegram username, and transaction records. We never share personal data with third parties. Transaction data is stored securely with encryption.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">8. Limitation of Liability</h2>
            <p>The Platform facilitates trades but is not responsible for the quality of goods exchanged. We are not liable for losses due to user error, network issues, or blockchain delays.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">9. Changes to Terms</h2>
            <p>We may update these terms at any time. Continued use of the Platform constitutes acceptance of modified terms.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
