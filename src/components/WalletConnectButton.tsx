import { useEffect } from "react";
import { useAccount, useDisconnect } from "wagmi";
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

  const open = () => {
    // @ts-ignore - web3modal exposes this
    document.querySelector("w3m-button")?.click?.();
  };

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
        {/* @ts-ignore web component */}
        <w3m-button balance="hide" size="sm" />
      </div>
    );
  }

  return (
    <>
      {/* @ts-ignore web component */}
      <w3m-button label="Connect Wallet" balance="hide" />
    </>
  );
}
