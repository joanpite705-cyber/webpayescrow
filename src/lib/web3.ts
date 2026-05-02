import { defaultWagmiConfig } from "@web3modal/wagmi/react/config";
import { createWeb3Modal } from "@web3modal/wagmi/react";
import { mainnet, bsc, polygon, arbitrum, optimism, base } from "wagmi/chains";

// WalletConnect Cloud project ID. Replace via admin panel/env if you have one.
// Until set, WalletConnect will still load but won't allow remote pairing.
const projectId = (import.meta as any).env?.VITE_WALLETCONNECT_PROJECT_ID || "00000000000000000000000000000000";

const metadata = {
  name: "EscrowPay",
  description: "Secure P2P crypto escrow",
  url: typeof window !== "undefined" ? window.location.origin : "https://webpayescrow.lovable.app",
  icons: ["/icons/icon-192.png"],
};

const chains = [mainnet, bsc, polygon, arbitrum, optimism, base] as const;

export const wagmiConfig = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
});

let initialized = false;
export function initWeb3Modal() {
  if (initialized || typeof window === "undefined") return;
  createWeb3Modal({
    wagmiConfig,
    projectId,
    enableAnalytics: false,
    themeMode: "dark",
  });
  initialized = true;
}
