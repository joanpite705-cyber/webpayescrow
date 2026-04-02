import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Send, AlertTriangle, Wallet, Copy, Clock, Star, ShieldCheck, CheckCircle, ThumbsUp, ThumbsDown, Shield } from "lucide-react";
import { t, getUserLanguage } from "@/lib/i18n";

export default function EscrowDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const lang = getUserLanguage();
  const [escrow, setEscrow] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [payments, setPayments] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [disputeReason, setDisputeReason] = useState("");
  const [showDispute, setShowDispute] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [wallets, setWallets] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState("");
  const [settings, setSettings] = useState<any>(null);
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({ rating: "", comment: "" });
  const [existingFeedback, setExistingFeedback] = useState<any[]>([]);
  const messagesEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    fetchData();

    // Real-time messages
    const msgChannel = supabase
      .channel(`escrow-msgs-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "escrow_messages", filter: `escrow_id=eq.${id}` },
        (payload) => setMessages((prev) => [...prev, payload.new]))
      .subscribe();

    // Real-time escrow status
    const escrowChannel = supabase
      .channel(`escrow-status-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "escrows", filter: `id=eq.${id}` },
        (payload) => setEscrow(payload.new))
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(escrowChannel);
    };
  }, [id]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Countdown timer
  useEffect(() => {
    if (!escrow?.payment_deadline || escrow.status !== "active") {
      setTimeLeft("");
      return;
    }
    const interval = setInterval(() => {
      const deadline = new Date(escrow.payment_deadline).getTime();
      const now = Date.now();
      const diff = deadline - now;
      if (diff <= 0) {
        setTimeLeft("EXPIRED");
        clearInterval(interval);
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}:${secs.toString().padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [escrow?.payment_deadline, escrow?.status]);

  const fetchData = async () => {
    const [escrowRes, msgsRes, pmtsRes, walletsRes, settingsRes] = await Promise.all([
      supabase.from("escrows").select("*").eq("id", id!).single(),
      supabase.from("escrow_messages").select("*").eq("escrow_id", id!).order("created_at"),
      supabase.from("payments").select("*").eq("escrow_id", id!).order("created_at"),
      supabase.from("crypto_wallets").select("*").eq("is_active", true),
      supabase.from("platform_settings").select("*").eq("id", 1).single(),
    ]);
    setEscrow(escrowRes.data);
    setMessages(msgsRes.data || []);
    setPayments(pmtsRes.data || []);
    setWallets(walletsRes.data || []);
    setSettings(settingsRes.data);

    if (escrowRes.data) {
      const ids = [escrowRes.data.buyer_id, escrowRes.data.seller_id, escrowRes.data.moderator_id].filter(Boolean);
      if (ids.length) {
        const { data } = await supabase.from("profiles").select("id, telegram_username, is_verified, positive_ratings, negative_ratings").in("id", ids);
        const map: Record<string, any> = {};
        data?.forEach((p) => (map[p.id] = p));
        setProfiles(map);
      }
      // Check feedback
      if (user) {
        const { data: fb } = await supabase.from("feedback").select("*").eq("escrow_id", id!);
        setExistingFeedback(fb || []);
        setFeedbackGiven(!!fb?.find((f: any) => f.from_user === user.id));
      }
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;
    await supabase.from("escrow_messages").insert({
      escrow_id: id!, sender_id: user.id, message: newMessage.trim(),
    });
    setNewMessage("");
  };

  const getMatchingWallets = () => {
    if (!escrow) return [];
    const ct = escrow.crypto_type;
    return wallets.filter((w) => {
      if (ct === "USDT") return w.crypto_name === "USDT" && w.network === "TRC20";
      if (ct === "USDT_ERC20") return w.crypto_name === "USDT" && w.network === "ERC20";
      return w.crypto_name === ct;
    });
  };

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    toast.success("Address copied!");
  };

  const acceptEscrow = async () => {
    if (!escrow || !user) return;
    const deadline = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const feeAmount = settings ? (escrow.amount * settings.fee_percentage / 100) : 0;
    const { error } = await supabase.from("escrows").update({
      status: "active" as const,
      accepted_at: new Date().toISOString(),
      payment_deadline: deadline,
      fee_amount: feeAmount,
    }).eq("id", escrow.id);
    if (error) toast.error(error.message);
    else {
      toast.success(t("escrow_accepted", lang));
      // Send safety message as system
      await supabase.from("escrow_messages").insert({
        escrow_id: id!, sender_id: user.id,
        message: settings?.safety_message || t("no_offline", lang),
      });
      fetchData();
    }
  };

  const declineEscrow = async () => {
    if (!escrow) return;
    const { error } = await supabase.from("escrows").update({ status: "cancelled" as const }).eq("id", escrow.id);
    if (error) toast.error(error.message);
    else { toast.success("Escrow declined"); fetchData(); }
  };

  const markPaid = async () => {
    if (!escrow || !user) return;
    const matching = getMatchingWallets();
    if (!matching.length) { toast.error("No active wallet found"); return; }
    const { error } = await supabase.from("payments").insert({
      escrow_id: id!, crypto_type: escrow.crypto_type,
      wallet_address: matching[0].wallet_address, amount: escrow.amount,
      tx_hash: txHash || null, status: "submitted" as const,
    });
    if (error) toast.error(error.message);
    else {
      await supabase.from("escrows").update({ status: "paid" as const }).eq("id", escrow.id);
      toast.success("Payment submitted! Waiting for admin confirmation.");
      setTxHash("");
      fetchData();
    }
  };

  const releaseFunds = async () => {
    if (!escrow) return;
    const { error } = await supabase.from("escrows").update({ status: "completed" as const }).eq("id", escrow.id);
    if (error) toast.error(error.message);
    else { toast.success("Funds released! Trade complete."); fetchData(); }
  };

  const raiseDispute = async () => {
    if (!disputeReason.trim() || !user) return;
    const { error } = await supabase.from("disputes").insert({
      escrow_id: id!, raised_by: user.id, reason: disputeReason.trim(),
    });
    if (error) toast.error(error.message);
    else {
      await supabase.from("escrows").update({ status: "disputed" as const }).eq("id", escrow.id);
      toast.success("Dispute raised. A moderator will join shortly.");
      setDisputeReason(""); setShowDispute(false);
      fetchData();
    }
  };

  const submitFeedback = async () => {
    if (!feedbackForm.rating || !user || !escrow) return;
    const toUser = escrow.buyer_id === user.id ? escrow.seller_id : escrow.buyer_id;
    const { error } = await supabase.from("feedback").insert({
      escrow_id: id!, from_user: user.id, to_user: toUser,
      rating: feedbackForm.rating, comment: feedbackForm.comment || null,
    });
    if (error) toast.error(error.message);
    else { toast.success("Feedback submitted!"); setFeedbackGiven(true); fetchData(); }
  };

  if (!escrow) {
    return <DashboardLayout><div className="p-10 text-center text-muted-foreground">Loading...</div></DashboardLayout>;
  }

  const isBuyer = escrow.buyer_id === user?.id;
  const isSeller = escrow.seller_id === user?.id;
  const isParty = isBuyer || isSeller;
  const isCreator = escrow.created_by === user?.id;
  const needsAcceptance = escrow.status === "pending" && isParty && !isCreator;
  const matchingWallets = getMatchingWallets();

  return (
    <DashboardLayout>
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Info panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{escrow.title}</h2>
              <StatusBadge status={escrow.status} />
            </div>

            {/* Countdown timer */}
            {escrow.status === "active" && timeLeft && (
              <div className={`rounded-lg p-3 mb-4 flex items-center gap-2 ${timeLeft === "EXPIRED" ? "bg-destructive/20 text-destructive" : "bg-warning/20 text-warning"}`}>
                <Clock className="h-4 w-4" />
                <span className="font-mono font-bold text-lg">{timeLeft}</span>
                <span className="text-xs">{timeLeft === "EXPIRED" ? t("expired", lang) : t("time_remaining", lang)}</span>
              </div>
            )}

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("amount", lang)}</span>
                <span className="font-mono font-semibold">{escrow.amount} {escrow.crypto_type}</span>
              </div>
              {escrow.fee_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("fee", lang)}</span>
                  <span className="font-mono text-warning">{escrow.fee_amount} {escrow.crypto_type}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("buyer", lang)}</span>
                <span className="flex items-center gap-1">
                  @{profiles[escrow.buyer_id]?.telegram_username || "—"}
                  {profiles[escrow.buyer_id]?.is_verified && <ShieldCheck className="h-3 w-3 text-primary" />}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("seller", lang)}</span>
                <span className="flex items-center gap-1">
                  @{profiles[escrow.seller_id]?.telegram_username || "—"}
                  {profiles[escrow.seller_id]?.is_verified && <ShieldCheck className="h-3 w-3 text-primary" />}
                </span>
              </div>
              {/* Ratings */}
              {[escrow.buyer_id, escrow.seller_id].filter(Boolean).map(pid => {
                const p = profiles[pid];
                if (!p) return null;
                return (
                  <div key={pid} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">@{p.telegram_username} ratings</span>
                    <span>👍{p.positive_ratings || 0} 👎{p.negative_ratings || 0}</span>
                  </div>
                );
              })}
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("created", lang)}</span>
                <span>{new Date(escrow.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            {escrow.description && (
              <p className="text-sm text-muted-foreground mt-4 pt-4 border-t border-border">{escrow.description}</p>
            )}
          </div>

          {/* Accept/Decline for counterpart */}
          {needsAcceptance && (
            <div className="glass-card p-6 border border-primary/30">
              <h3 className="font-semibold mb-3 text-primary">🤝 {t("accept_escrow", lang)}?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Review the details above. Once you accept, a 30-minute payment window starts.
              </p>
              <div className="flex gap-2">
                <Button onClick={acceptEscrow} className="flex-1 gap-2">
                  <CheckCircle className="h-4 w-4" /> {t("accept", lang)}
                </Button>
                <Button variant="outline" onClick={declineEscrow} className="flex-1 text-destructive border-destructive/30">
                  {t("decline_escrow", lang)}
                </Button>
              </div>
            </div>
          )}

          {/* Buyer: Show wallet addresses to pay */}
          {isBuyer && (escrow.status === "active") && matchingWallets.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                <Wallet className="h-4 w-4 text-primary" /> Send Payment To
              </h3>
              {matchingWallets.map((w) => (
                <div key={w.id} className="flex items-center justify-between bg-secondary/50 rounded-md p-3 mb-2 last:mb-0">
                  <div>
                    <p className="text-xs text-muted-foreground">{w.crypto_name} — {w.network}</p>
                    <p className="font-mono text-xs mt-1 break-all">{w.wallet_address}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => copyAddress(w.wallet_address)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Mark as Paid (buyer) */}
          {isBuyer && escrow.status === "active" && (
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Wallet className="h-4 w-4" /> {t("mark_paid", lang)}
              </h3>
              <Input value={txHash} onChange={(e) => setTxHash(e.target.value)}
                placeholder="Transaction hash (optional)" className="mb-3" />
              <Button onClick={markPaid} className="w-full">{t("mark_paid", lang)}</Button>
              <p className="text-xs text-muted-foreground mt-2">After marking paid, admin will verify and confirm the payment.</p>
            </div>
          )}

          {/* Seller: Release funds after admin confirms */}
          {isSeller && escrow.status === "confirmed" && (
            <div className="glass-card p-6 border border-emerald-500/30">
              <h3 className="font-semibold mb-3 text-emerald-400 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> Payment Confirmed by Admin
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Admin has confirmed the buyer's payment. Once you've delivered the goods/service, release the funds to complete the trade.
              </p>
              <Button onClick={releaseFunds} className="w-full bg-emerald-600 hover:bg-emerald-700">
                {t("release_funds", lang)}
              </Button>
            </div>
          )}

          {/* Payments list */}
          {payments.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-3">{t("payments", lang)}</h3>
              <div className="space-y-3">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span className="font-mono">{p.amount} {p.crypto_type}</span>
                    <StatusBadge status={p.status} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feedback section */}
          {escrow.status === "completed" && isParty && !feedbackGiven && (
            <div className="glass-card p-6 border border-primary/30">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Star className="h-4 w-4 text-primary" /> {t("rate_trade", lang)}
              </h3>
              <div className="flex gap-3 mb-3">
                <Button variant={feedbackForm.rating === "positive" ? "default" : "outline"}
                  onClick={() => setFeedbackForm({ ...feedbackForm, rating: "positive" })} className="flex-1 gap-2">
                  <ThumbsUp className="h-4 w-4" /> {t("positive", lang)}
                </Button>
                <Button variant={feedbackForm.rating === "negative" ? "destructive" : "outline"}
                  onClick={() => setFeedbackForm({ ...feedbackForm, rating: "negative" })} className="flex-1 gap-2">
                  <ThumbsDown className="h-4 w-4" /> {t("negative", lang)}
                </Button>
              </div>
              <Input value={feedbackForm.comment} onChange={(e) => setFeedbackForm({ ...feedbackForm, comment: e.target.value })}
                placeholder={t("leave_comment", lang)} className="mb-3" />
              <Button onClick={submitFeedback} disabled={!feedbackForm.rating} className="w-full">
                {t("submit_feedback", lang)}
              </Button>
            </div>
          )}

          {/* Show existing feedback */}
          {existingFeedback.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-3">{t("feedback", lang)}</h3>
              {existingFeedback.map((f) => (
                <div key={f.id} className="flex items-center gap-2 text-sm mb-2">
                  {f.rating === "positive" ? <ThumbsUp className="h-4 w-4 text-emerald-400" /> : <ThumbsDown className="h-4 w-4 text-destructive" />}
                  <span className="text-muted-foreground">{f.comment || (f.rating === "positive" ? "Positive" : "Negative")}</span>
                </div>
              ))}
            </div>
          )}

          {/* Dispute button */}
          {!showDispute && isParty && !["completed", "cancelled"].includes(escrow.status) && escrow.status !== "pending" && (
            <Button variant="outline" className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => setShowDispute(true)}>
              <AlertTriangle className="h-4 w-4 mr-2" /> {t("raise_dispute", lang)}
            </Button>
          )}
          {showDispute && (
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-3 text-destructive">{t("raise_dispute", lang)}</h3>
              <Textarea value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)}
                placeholder={t("dispute_reason", lang)} rows={3} className="mb-3" />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowDispute(false)} className="flex-1">{t("cancel", lang)}</Button>
                <Button onClick={raiseDispute} variant="destructive" className="flex-1">{t("confirm", lang)}</Button>
              </div>
            </div>
          )}
        </div>

        {/* Chat */}
        <div className="lg:col-span-2 glass-card flex flex-col" style={{ height: "calc(100vh - 12rem)" }}>
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold">{t("escrow_chat", lang)}</h3>
            {escrow.status === "disputed" && (
              <span className="text-xs bg-destructive/20 text-destructive px-2 py-1 rounded flex items-center gap-1">
                <Shield className="h-3 w-3" /> Disputed — Moderator will review
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => {
              const isMe = m.sender_id === user?.id;
              const senderProfile = profiles[m.sender_id];
              // Check if this is a safety/system message (first message)
              const isSystemMsg = i === 0 && m.message?.includes("⚠️");
              return (
                <div key={m.id} className={`flex ${isSystemMsg ? "justify-center" : isMe ? "justify-end" : "justify-start"}`}>
                  {isSystemMsg ? (
                    <div className="max-w-[90%] rounded-xl px-4 py-2.5 text-sm bg-warning/10 text-warning border border-warning/20">
                      <p className="text-xs font-semibold mb-1">⚠️ {t("safety_warning", lang)}</p>
                      <p>{m.message}</p>
                    </div>
                  ) : (
                    <div className={`max-w-[70%] rounded-xl px-4 py-2.5 text-sm ${
                      isMe ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                    }`}>
                      {!isMe && (
                        <p className="text-xs opacity-70 mb-1 flex items-center gap-1">
                          @{senderProfile?.telegram_username || "user"}
                          {senderProfile?.is_verified && <ShieldCheck className="h-3 w-3" />}
                        </p>
                      )}
                      <p>{m.message}</p>
                      <p className="text-[10px] opacity-50 mt-1">{new Date(m.created_at).toLocaleTimeString()}</p>
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEnd} />
          </div>
          {!["completed", "cancelled"].includes(escrow.status) && (
            <div className="p-4 border-t border-border flex gap-2">
              <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                placeholder={t("type_message", lang)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()} />
              <Button onClick={sendMessage} size="icon"><Send className="h-4 w-4" /></Button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
