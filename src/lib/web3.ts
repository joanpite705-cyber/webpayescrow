import { defaultWagmiConfig } from "@web3modal/wagmi/react/config";
import { createWeb3Modal } from "@web3modal/wagmi/react";
import { mainnet, bsc, polygon, arbitrum, optimism, base } from "wagmi/chains";
import { supabase } from "@/integrations/supabase/client";
import type { Config } from "wagmi";

const FALLBACK_PROJECT_ID =
  (import.meta as any).env?.VITE_WALLETCONNECT_PROJECT_ID || "";

const metadata = {
  name: "EscrowPay",
  description: "Secure P2P crypto escrow",
  url: typeof window !== "undefined" ? window.location.origin : "https://webpayescrow.lovable.app",
  icons: typeof window !== "undefined" ? [`${window.location.origin}/icons/icon-192.png`] : [],
};

const chains = [mainnet, bsc, polygon, arbitrum, optimism, base] as const;

async function fetchAdminProjectId(): Promise<string | null> {
  try {
    const { data } = await (supabase as any).rpc("get_walletconnect_project_id");
    if (typeof data === "string" && data.length >= 16) return data;
  } catch {}
  return null;
}

let _config: Config | null = null;
let _initPromise: Promise<Config> | null = null;

export function buildWagmiWithId(projectId: string): Config {
  return defaultWagmiConfig({ chains, projectId, metadata });
}

export async function initWeb3Stack(): Promise<Config> {
  if (_config) return _config;
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    const remote = await fetchAdminProjectId();
    const id = remote || FALLBACK_PROJECT_ID || "00000000000000000000000000000000";
    const cfg = buildWagmiWithId(id);
    if (typeof window !== "undefined") {
      createWeb3Modal({ wagmiConfig: cfg, projectId: id, enableAnalytics: false, themeMode: "dark" });
    }
    _config = cfg;
    return cfg;
  })();
  return _initPromise;
}

// Back-compat
export const initWeb3Modal = initWeb3Stack;
