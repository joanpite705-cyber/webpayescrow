import { useEffect } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { useWeb3Modal } from "@web3modal/wagmi/react";
import { Button } from "@/components/ui/button";
import { Wallet, LogOut } from "lucide-react";
import { initWeb3Modal } from "@/lib/web3";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function WalletConnectButton({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const { address, chainId, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { open } = useWeb3Modal();

  useEffect(() => { initWeb3Modal(); }, []);

  // Persist connected wallet to DB
  useEffect(() => {
    if (!user || !address || !isConnected) return;
    (async () => {
      await supabase.from("connected_wallets").upsert(
        { user_id: user.id, address, chain_id: chainId ?? null, is_primary: true },
        { onConflict: "user_id,address,chain_id" }
      );
    })();
  }, [user, address, chainId, isConnected]);

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" size={compact ? "sm" : "default"} className="gap-2" onClick={() => {
          navigator.clipboard.writeText(address);
          toast.success("Address copied");
        }}>
          <Wallet className="h-4 w-4" />
          {address.slice(0, 6)}…{address.slice(-4)}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => disconnect()} title="Disconnect">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button variant="outline" size={compact ? "sm" : "default"} className="gap-2" onClick={() => open()}>
      <Wallet className="h-4 w-4" />
      {compact ? "Connect" : "Connect Wallet"}
    </Button>
  );
}
