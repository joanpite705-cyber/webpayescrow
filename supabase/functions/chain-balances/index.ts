// Read-only multi-chain balance fetcher.
// Auth: requires logged-in user (uses anon key + Authorization header).
// Body: { addresses: { chain_key: string; address: string }[] }
// Returns: { balances: { chain_key, symbol, address, balance, decimals }[] }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type ChainCfg = {
  chain_key: string;
  family: string;
  chain_id: number | null;
  rpc_url: string | null;
  native_symbol: string;
  native_decimals: number;
};

type TokenCfg = {
  chain_key: string;
  symbol: string;
  contract_address: string;
  decimals: number;
};

function hex(n: bigint) { return "0x" + n.toString(16); }

async function evmRpc(rpc: string, method: string, params: any[]) {
  const r = await fetch(rpc, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message);
  return j.result;
}

async function evmNativeBalance(rpc: string, address: string): Promise<string> {
  const hexBal: string = await evmRpc(rpc, "eth_getBalance", [address, "latest"]);
  return BigInt(hexBal).toString();
}

async function evmTokenBalance(rpc: string, contract: string, address: string): Promise<string> {
  // balanceOf(address) selector 0x70a08231 + padded address
  const data = "0x70a08231" + address.replace(/^0x/, "").padStart(64, "0");
  const res: string = await evmRpc(rpc, "eth_call", [{ to: contract, data }, "latest"]);
  return BigInt(res || "0x0").toString();
}

async function tronNativeBalance(_address: string): Promise<string> {
  // Lightweight: hit public TronGrid; if not configured return 0
  try {
    const r = await fetch("https://api.trongrid.io/v1/accounts/" + _address);
    const j = await r.json();
    const bal = j?.data?.[0]?.balance ?? 0;
    return BigInt(bal).toString();
  } catch { return "0"; }
}

async function solanaNativeBalance(rpc: string, address: string): Promise<string> {
  const r = await fetch(rpc || "https://api.mainnet-beta.solana.com", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getBalance", params: [address] }),
  });
  const j = await r.json();
  return BigInt(j?.result?.value ?? 0).toString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const auth = req.headers.get("Authorization") ?? "";
    const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData } = await supa.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "content-type": "application/json" } });
    }

    const { addresses } = await req.json() as { addresses: { chain_key: string; address: string }[] };
    if (!Array.isArray(addresses) || addresses.length === 0) {
      return new Response(JSON.stringify({ balances: [] }), { headers: { ...corsHeaders, "content-type": "application/json" } });
    }

    // Service-role read of chain_configs (admin-only RLS, but edge fn can fetch via PG REST using service key)
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: chains } = await admin.from("chain_configs").select("chain_key,family,chain_id,rpc_url,native_symbol,native_decimals").eq("is_active", true);
    const { data: tokens } = await admin.from("chain_tokens").select("chain_key,symbol,contract_address,decimals").eq("is_active", true);

    const chainMap = new Map<string, ChainCfg>();
    (chains as ChainCfg[] ?? []).forEach((c) => chainMap.set(c.chain_key, c));
    const tokensByChain = new Map<string, TokenCfg[]>();
    (tokens as TokenCfg[] ?? []).forEach((t) => {
      const arr = tokensByChain.get(t.chain_key) ?? [];
      arr.push(t);
      tokensByChain.set(t.chain_key, arr);
    });

    const out: any[] = [];
    for (const a of addresses) {
      const c = chainMap.get(a.chain_key);
      if (!c) continue;
      try {
        if (c.family === "evm" && c.rpc_url) {
          const native = await evmNativeBalance(c.rpc_url, a.address);
          out.push({ chain_key: c.chain_key, symbol: c.native_symbol, address: a.address, balance: native, decimals: c.native_decimals });
          for (const t of tokensByChain.get(c.chain_key) ?? []) {
            try {
              const b = await evmTokenBalance(c.rpc_url, t.contract_address, a.address);
              if (b !== "0") out.push({ chain_key: c.chain_key, symbol: t.symbol, address: a.address, balance: b, decimals: t.decimals, contract: t.contract_address });
            } catch { /* ignore token errors */ }
          }
        } else if (c.family === "tron") {
          const native = await tronNativeBalance(a.address);
          out.push({ chain_key: c.chain_key, symbol: c.native_symbol, address: a.address, balance: native, decimals: c.native_decimals });
        } else if (c.family === "solana") {
          const native = await solanaNativeBalance(c.rpc_url ?? "", a.address);
          out.push({ chain_key: c.chain_key, symbol: c.native_symbol, address: a.address, balance: native, decimals: c.native_decimals });
        }
        // BTC: balance lookup requires explorer API; skipped in this iteration
      } catch (e) {
        out.push({ chain_key: c.chain_key, symbol: c.native_symbol, address: a.address, balance: "0", decimals: c.native_decimals, error: (e as Error).message });
      }
    }

    return new Response(JSON.stringify({ balances: out }), { headers: { ...corsHeaders, "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } });
  }
});