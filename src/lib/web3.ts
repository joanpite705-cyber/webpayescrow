import { defaultWagmiConfig } from "@web3modal/wagmi/react/config";
import { createWeb3Modal } from "@web3modal/wagmi/react";
import { mainnet, bsc, polygon, arbitrum, optimism, base } from "wagmi/chains";
import { supabase } from "@/integrations/supabase/client";

// Fallback (env or zero) — admin-configured ID is fetched at runtime.
const FALLBACK_PROJECT_ID =
  (import.meta as any).env?.VITE_WALLETCONNECT_PROJECT_ID ||
  "00000000000000000000000000000000";

let dynamicProjectId = FALLBACK_PROJECT_ID;

const metadata = {
  name: "EscrowPay",
  description: "Secure P2P crypto escrow",
  url: typeof window !== "undefined" ? window.location.origin : "https://webpayescrow.lovable.app",
  icons: ["/icons/icon-192.png"],
};

const chains = [mainnet, bsc, polygon, arbitrum, optimism, base] as const;

// Build wagmi config eagerly with fallback so providers load. We re-init the
// modal once we fetch the admin-configured Project ID from app_config.
export const wagmiConfig = defaultWagmiConfig({
  chains,
  projectId: dynamicProjectId,
  metadata,
});

let initialized = false;
let initializedWith = "";

async function fetchAdminProjectId(): Promise<string | null> {
  try {
    const { data } = await (supabase as any).rpc("get_walletconnect_project_id");
    if (typeof data === "string" && data.length >= 16) return data;
  } catch {}
  return null;
}

export async function initWeb3Modal() {
  if (typeof window === "undefined") return;
  const remote = await fetchAdminProjectId();
  const id = remote || dynamicProjectId;
  if (initialized && initializedWith === id) return;
  dynamicProjectId = id;
  createWeb3Modal({
    wagmiConfig,
    projectId: id,
    enableAnalytics: false,
    themeMode: "dark",
  });
  initialized = true;
  initializedWith = id;
}
