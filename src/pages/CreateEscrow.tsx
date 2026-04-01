import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function CreateEscrow() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    amount: "",
    crypto_type: "USDT",
    role: "buyer" as "buyer" | "seller",
    counterpart: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    // Find counterpart by telegram username
    const { data: counterpartProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_username", form.counterpart.replace("@", ""))
      .single();

    if (!counterpartProfile) {
      toast.error("Counterpart not found. Make sure they have an account.");
      setLoading(false);
      return;
    }

    const escrowData: any = {
      title: form.title,
      description: form.description,
      amount: parseFloat(form.amount),
      crypto_type: form.crypto_type,
      created_by: user.id,
      status: "pending" as const,
    };

    if (form.role === "buyer") {
      escrowData.buyer_id = user.id;
      escrowData.seller_id = counterpartProfile.id;
    } else {
      escrowData.seller_id = user.id;
      escrowData.buyer_id = counterpartProfile.id;
    }

    const { error } = await supabase.from("escrows").insert(escrowData);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Escrow created!");
      navigate("/dashboard/escrows");
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-xl">
        <h1 className="text-2xl font-bold mb-2">Create Escrow</h1>
        <p className="text-muted-foreground mb-8">Set up a new trade with another user.</p>

        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>I am the</Label>
                <Select value={form.role} onValueChange={(v: "buyer" | "seller") => setForm({ ...form, role: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buyer">Buyer</SelectItem>
                    <SelectItem value="seller">Seller</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Counterpart Username</Label>
                <Input value={form.counterpart} onChange={(e) => setForm({ ...form, counterpart: e.target.value })}
                  placeholder="@username" required className="mt-1.5" />
              </div>
            </div>

            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Netflix Account" required className="mt-1.5" />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe what's being sold..." className="mt-1.5" rows={3} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Amount</Label>
                <Input type="number" step="0.00000001" value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00" required className="mt-1.5" />
              </div>
              <div>
                <Label>Crypto</Label>
                <Select value={form.crypto_type} onValueChange={(v) => setForm({ ...form, crypto_type: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USDT">USDT (TRC20)</SelectItem>
                    <SelectItem value="USDT_ERC20">USDT (ERC20)</SelectItem>
                    <SelectItem value="BTC">Bitcoin</SelectItem>
                    <SelectItem value="ETH">Ethereum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating..." : "Create Escrow"}
            </Button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
