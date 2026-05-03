import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Shield, ArrowLeft, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [botLink, setBotLink] = useState("");

  const hash = window.location.hash;
  const isRecovery = hash.includes("type=recovery");

  useEffect(() => {
    (supabase as any).rpc("get_bot_username").then(({ data }: { data: string | null }) => {
      if (data) setBotLink(`https://t.me/${String(data).replace("@", "")}`);
    });
  }, []);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Password updated successfully!");
      window.location.href = "/login";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold gradient-text">EscrowBot</span>
          </Link>
          <h1 className="text-2xl font-bold">{isRecovery ? "Set New Password" : "Reset Password"}</h1>
          <p className="text-muted-foreground mt-1">
            {isRecovery ? "Enter your new password below" : "Use the Telegram bot to reset your password"}
          </p>
        </div>

        <div className="glass-card p-8">
          {isRecovery ? (
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" required className="mt-1.5" />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          ) : (
            <div className="text-center py-4 space-y-4">
              <MessageSquare className="h-12 w-12 text-primary mx-auto" />
              <p className="text-muted-foreground">
                Password resets are handled through the Telegram bot for security.
              </p>
              <p className="text-sm text-muted-foreground">
                Open the bot and use the <strong>/resetpassword</strong> command to get a temporary password.
              </p>
              {botLink ? (
                <a href={botLink} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full gap-2">
                    <MessageSquare className="h-4 w-4" /> Open Telegram Bot
                  </Button>
                </a>
              ) : (
                <Button className="w-full" disabled>Bot not configured</Button>
              )}
            </div>
          )}

          <div className="mt-6 text-center">
            <Link to="/login" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              <ArrowLeft className="h-3 w-3" /> Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
