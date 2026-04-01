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
import { Send, AlertTriangle, Wallet, Copy } from "lucide-react";

export default function EscrowDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [escrow, setEscrow] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [payments, setPayments] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [disputeReason, setDisputeReason] = useState("");
  const [showDispute, setShowDispute] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [wallets, setWallets] = useState<any[]>([]);
  const messagesEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    fetchData();
    const channel = supabase
      .channel(`escrow-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "escrow_messages", filter: `escrow_id=eq.${id}` },
        (payload) => setMessages((prev) => [...prev, payload.new]))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchData = async () => {
    const [escrowRes, msgsRes, pmtsRes, walletsRes] = await Promise.all([
      supabase.from("escrows").select("*").eq("id", id!).single(),
      supabase.from("escrow_messages").select("*").eq("escrow_id", id!).order("created_at"),
      supabase.from("payments").select("*").eq("escrow_id", id!).order("created_at"),
      supabase.from("crypto_wallets").select("*").eq("is_active", true),
    ]);
    setEscrow(escrowRes.data);
    setMessages(msgsRes.data || []);
    setPayments(pmtsRes.data || []);
    setWallets(walletsRes.data || []);

    if (escrowRes.data) {
      const ids = [escrowRes.data.buyer_id, escrowRes.data.seller_id].filter(Boolean);
      if (ids.length) {
        const { data } = await supabase.from("profiles").select("id, telegram_username").in("id", ids);
        const map: Record<string, any> = {};
        data?.forEach((p) => (map[p.id] = p));
        setProfiles(map);
      }
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;
    await supabase.from("escrow_messages").insert({
      escrow_id: id!,
      sender_id: user.id,
      message: newMessage.trim(),
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

  const submitPayment = async () => {
    if (!escrow || !user) return;
    const matching = getMatchingWallets();
    if (!matching.length) {
      toast.error("No active wallet found for this crypto");
      return;
    }
    const { error } = await supabase.from("payments").insert({
      escrow_id: id!,
      crypto_type: escrow.crypto_type,
      wallet_address: matching[0].wallet_address,
      amount: escrow.amount,
      tx_hash: txHash || null,
      status: "submitted" as const,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Payment submitted! Waiting for admin confirmation.");
      setTxHash("");
      fetchData();
    }
  };

  const raiseDispute = async () => {
    if (!disputeReason.trim() || !user) return;
    const { error } = await supabase.from("disputes").insert({
      escrow_id: id!,
      raised_by: user.id,
      reason: disputeReason.trim(),
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Dispute raised.");
      setDisputeReason("");
      setShowDispute(false);
    }
  };

  if (!escrow) {
    return <DashboardLayout><div className="p-10 text-center text-muted-foreground">Loading...</div></DashboardLayout>;
  }

  const isBuyer = escrow.buyer_id === user?.id;
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
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-mono font-semibold">{escrow.amount} {escrow.crypto_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Buyer</span>
                <span>@{profiles[escrow.buyer_id]?.telegram_username || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Seller</span>
                <span>@{profiles[escrow.seller_id]?.telegram_username || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{new Date(escrow.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            {escrow.description && (
              <p className="text-sm text-muted-foreground mt-4 pt-4 border-t border-border">{escrow.description}</p>
            )}
          </div>

          {/* Buyer: Show wallet addresses to pay */}
          {isBuyer && (escrow.status === "active" || escrow.status === "pending") && matchingWallets.length > 0 && (
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

          {/* Payment action (buyer) */}
          {isBuyer && escrow.status === "active" && (
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><Wallet className="h-4 w-4" /> Submit Payment</h3>
              <Input value={txHash} onChange={(e) => setTxHash(e.target.value)}
                placeholder="Transaction hash (optional)" className="mb-3" />
              <Button onClick={submitPayment} className="w-full">Submit Payment Proof</Button>
            </div>
          )}

          {/* Payments */}
          {payments.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-3">Payments</h3>
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

          {/* Dispute button */}
          {!showDispute && escrow.status !== "completed" && escrow.status !== "cancelled" && (
            <Button variant="outline" className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => setShowDispute(true)}>
              <AlertTriangle className="h-4 w-4 mr-2" /> Raise Dispute
            </Button>
          )}
          {showDispute && (
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-3 text-destructive">Raise Dispute</h3>
              <Textarea value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Describe the issue..." rows={3} className="mb-3" />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowDispute(false)} className="flex-1">Cancel</Button>
                <Button onClick={raiseDispute} variant="destructive" className="flex-1">Submit</Button>
              </div>
            </div>
          )}
        </div>

        {/* Chat */}
        <div className="lg:col-span-2 glass-card flex flex-col" style={{ height: "calc(100vh - 12rem)" }}>
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">Escrow Chat</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m) => {
              const isMe = m.sender_id === user?.id;
              return (
                <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] rounded-xl px-4 py-2.5 text-sm ${
                    isMe ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                  }`}>
                    {!isMe && (
                      <p className="text-xs opacity-70 mb-1">@{profiles[m.sender_id]?.telegram_username || "user"}</p>
                    )}
                    <p>{m.message}</p>
                    <p className="text-[10px] opacity-50 mt-1">{new Date(m.created_at).toLocaleTimeString()}</p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEnd} />
          </div>
          <div className="p-4 border-t border-border flex gap-2">
            <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              onKeyDown={(e) => e.key === "Enter" && sendMessage()} />
            <Button onClick={sendMessage} size="icon"><Send className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
