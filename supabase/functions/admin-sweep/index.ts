// Admin-only: sweep funds from treasury to cold wallet on a given chain.
// Body: { chain_key: string, token_symbol?: string, to_address?: string }
//   - omit token_symbol to sweep native
//   - to_address overrides the configured cold wallet for this sweep
// EVM signing uses ethers via esm.sh. Non-EVM chains return 'not_implemented'.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { ethers } from "https://esm.sh/ethers@6.13.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
];

async function isAdmin(supa: any, userId: string) {
  const { data } = await supa.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  return !!data;
}

// Build best RPC URL — prefer Alchemy when an API key is configured for chains it supports.
function alchemyRpc(chainKey: string, key: string): string | null {
  const map: Record<string, string> = {
    ethereum: `https://eth-mainnet.g.alchemy.com/v2/${key}`,
    polygon: `https://polygon-mainnet.g.alchemy.com/v2/${key}`,
    arbitrum: `https://arb-mainnet.g.alchemy.com/v2/${key}`,
    optimism: `https://opt-mainnet.g.alchemy.com/v2/${key}`,
    base: `https://base-mainnet.g.alchemy.com/v2/${key}`,
  };
  return map[chainKey] || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });
    const admin = createClient(SUPABASE_URL, SERVICE);
    if (!(await isAdmin(admin, u.user.id))) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: corsHeaders });
    }

    const body = await req.json() as { chain_key: string; token_symbol?: string; to_address?: string };
    const { data: c } = await admin.from("chain_configs").select("*").eq("chain_key", body.chain_key).maybeSingle();
    if (!c) return new Response(JSON.stringify({ error: "chain_not_configured" }), { status: 400, headers: corsHeaders });
    const destination = (body.to_address && body.to_address.trim()) || c.cold_wallet_address;
    if (!destination) return new Response(JSON.stringify({ error: "destination_address_required" }), { status: 400, headers: corsHeaders });
    if (!c.treasury_private_key) return new Response(JSON.stringify({ error: "treasury_not_configured" }), { status: 400, headers: corsHeaders });

    // Pull Alchemy key from app_config for better RPC reliability
    const { data: appCfg } = await admin.from("app_config").select("alchemy_api_key").eq("id", 1).maybeSingle();
    const alchemyKey = appCfg?.alchemy_api_key?.trim();
    const rpcUrl = (alchemyKey && c.family === "evm" ? alchemyRpc(c.chain_key, alchemyKey) : null) || c.rpc_url;
    if (!rpcUrl) return new Response(JSON.stringify({ error: "rpc_not_configured" }), { status: 400, headers: corsHeaders });

    const job = await admin.from("sweep_jobs").insert({
      chain_key: c.chain_key, from_address: c.treasury_address ?? "", to_address: destination,
      token_symbol: body.token_symbol ?? c.native_symbol, status: "pending", trigger_type: "manual", initiated_by: u.user.id,
    }).select().single();
    const jobId = job.data?.id;

    const finish = async (patch: any) => admin.from("sweep_jobs").update(patch).eq("id", jobId);

    if (c.family !== "evm") {
      await finish({ status: "failed", error_message: "non_evm_signing_not_implemented" });
      return new Response(JSON.stringify({ error: "non_evm_signing_not_implemented", job_id: jobId }), { status: 400, headers: corsHeaders });
    }

    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const wallet = new ethers.Wallet(c.treasury_private_key, provider);
      let txHash: string;
      let amountStr: string;

      if (!body.token_symbol || body.token_symbol === c.native_symbol) {
        // Native sweep — leave min_gas_reserve behind
        const bal = await provider.getBalance(wallet.address);
        const reserve = ethers.parseUnits(String(c.min_gas_reserve ?? "0"), c.native_decimals);
        const feeData = await provider.getFeeData();
        const gasLimit = 21000n;
        const maxFee = (feeData.maxFeePerGas ?? feeData.gasPrice ?? 0n) * gasLimit;
        const sendable = bal - reserve - maxFee;
        if (sendable <= 0n) throw new Error("insufficient_native_balance");
        const tx = await wallet.sendTransaction({ to: destination, value: sendable });
        txHash = tx.hash;
        amountStr = ethers.formatUnits(sendable, c.native_decimals);
      } else {
        // ERC20 sweep — auto-fund gas from gas wallet if treasury has insufficient native
        const { data: tokenRow } = await admin.from("chain_tokens").select("contract_address,decimals").eq("chain_key", c.chain_key).eq("symbol", body.token_symbol).maybeSingle();
        if (!tokenRow) throw new Error("token_not_configured");
        const erc = new ethers.Contract(tokenRow.contract_address, ERC20_ABI, wallet);
        const tokenBal: bigint = await erc.balanceOf(wallet.address);
        if (tokenBal === 0n) throw new Error("zero_token_balance");

        const feeData = await provider.getFeeData();
        const gasLimit = 80000n;
        const gasNeeded = (feeData.maxFeePerGas ?? feeData.gasPrice ?? 0n) * gasLimit;
        const treasuryNative = await provider.getBalance(wallet.address);

        if (treasuryNative < gasNeeded && c.gas_wallet_private_key) {
          const gasWallet = new ethers.Wallet(c.gas_wallet_private_key, provider);
          const fundAmt = gasNeeded - treasuryNative + (gasNeeded / 4n); // 25% buffer
          const fundTx = await gasWallet.sendTransaction({ to: wallet.address, value: fundAmt });
          await finish({ gas_funding_tx: fundTx.hash, status: "gas_funding" });
          await fundTx.wait(1);
        }

        await finish({ status: "sweeping" });
        const tx = await erc.transfer(destination, tokenBal);
        txHash = tx.hash;
        amountStr = ethers.formatUnits(tokenBal, tokenRow.decimals);
      }

      await finish({ status: "completed", sweep_tx: txHash, amount: amountStr });
      return new Response(JSON.stringify({ ok: true, tx: txHash, amount: amountStr, job_id: jobId }), { headers: { ...corsHeaders, "content-type": "application/json" } });
    } catch (e) {
      await finish({ status: "failed", error_message: (e as Error).message });
      return new Response(JSON.stringify({ error: (e as Error).message, job_id: jobId }), { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } });
  }
});